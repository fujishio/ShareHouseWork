import { EXPENSE_CATEGORIES } from "../../domain/expenses/expense-categories.ts";
import {
  getJstDateString,
  normalizeShoppingDate,
} from "../../domain/shopping/shopping-api-validation.ts";
import {
  zIsoDateString,
  zNonEmptyTrimmedString,
  zTrimmedString,
} from "../../shared/lib/api-validation.ts";
import type {
  AuditLogRecord,
  CreateShoppingItemInput,
  ShoppingItem,
} from "../../types/index.ts";
import { z } from "zod";
import { logAppAuditEvent } from "./audit-log-service.ts";
import {
  errorResponse,
  readJsonBody,
  resolveHouseScopedContext,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

type Params = { params: Promise<{ id: string }> };

export type GetShoppingDeps = {
  readShoppingItems: (houseId: string) => Promise<ShoppingItem[]>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateShoppingDeps = {
  appendShoppingItem: (input: CreateShoppingItemInput) => Promise<ShoppingItem>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type PatchShoppingDeps = {
  readShoppingItems: (houseId: string) => Promise<ShoppingItem[]>;
  checkShoppingItem: (
    id: string,
    input: { checkedBy: string },
    checkedAt: string
  ) => Promise<ShoppingItem | null>;
  uncheckShoppingItem: (id: string) => Promise<ShoppingItem | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type DeleteShoppingDeps = {
  readShoppingItems: (houseId: string) => Promise<ShoppingItem[]>;
  cancelShoppingItem: (
    id: string,
    canceledBy: string,
    canceledAt: string
  ) => Promise<ShoppingItem | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

const createShoppingSchema = z.object({
  name: zNonEmptyTrimmedString.pipe(z.string().max(120)),
  quantity: zTrimmedString.pipe(z.string().max(60)).default("1"),
  memo: zTrimmedString.pipe(z.string().max(500)).default(""),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  addedAt: z
    .string()
    .optional()
    .transform((value, context) => {
      if (!value) return getJstDateString();

      const normalized = normalizeShoppingDate(value);
      if (!normalized) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid addedAt date",
        });
        return z.NEVER;
      }
      return normalized;
    })
    .pipe(zIsoDateString),
});

const patchShoppingSchema = z.object({
  uncheck: z.boolean().optional(),
});

export async function handleGetShoppingItems(request: Request, deps: GetShoppingDeps) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const items = await deps.readShoppingItems(context.houseId);
  return Response.json({ data: items });
}

export async function handleCreateShoppingItem(
  request: Request,
  deps: CreateShoppingDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = createShoppingSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "addedAt") {
      return validationError("Invalid addedAt date", parsed.error.issues);
    }
    return validationError("name is required", parsed.error.issues);
  }

  const input: CreateShoppingItemInput = {
    houseId: context.houseId,
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    memo: parsed.data.memo,
    category: parsed.data.category,
    addedBy: context.actor.name,
    addedAt: parsed.data.addedAt,
  };

  const created = await deps.appendShoppingItem(input);

  await logAppAuditEvent(deps, {
    houseId: context.houseId,
    action: "shopping_created",
    actor: context.actor.name,
    details: {
      shoppingItemId: created.id,
      name: created.name,
      quantity: created.quantity,
      category: created.category ?? null,
      addedAt: created.addedAt,
    },
  });

  return Response.json({ data: created }, { status: 201 });
}

export async function handlePatchShoppingItem(
  request: Request,
  { params }: Params,
  deps: PatchShoppingDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { id } = await params;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = patchShoppingSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return validationError("Invalid body", parsed.error.issues);
  }

  const existing = (await deps.readShoppingItems(context.houseId)).find((item) => item.id === id);
  if (!existing) {
    return errorResponse("Shopping item not found", 404, "SHOPPING_NOT_FOUND");
  }

  if (parsed.data.uncheck === true) {
    const updated = await deps.uncheckShoppingItem(id);
    if (!updated) {
      return errorResponse("Shopping item not found", 404, "SHOPPING_NOT_FOUND");
    }

    if (existing.checkedAt && !existing.canceledAt) {
      await logAppAuditEvent(deps, {
        houseId: context.houseId,
        action: "shopping_unchecked",
        actor: context.actor.name,
        details: {
          shoppingItemId: updated.id,
          name: updated.name,
        },
      });
    }
    return Response.json({ data: updated });
  }

  const checkedAt = getJstDateString();

  const updated = await deps.checkShoppingItem(
    id,
    { checkedBy: context.actor.name },
    checkedAt
  );
  if (!updated) {
    return errorResponse("Shopping item not found", 404, "SHOPPING_NOT_FOUND");
  }

  if (!existing.checkedAt && !existing.canceledAt && updated.checkedAt) {
    await logAppAuditEvent(deps, {
      houseId: context.houseId,
      action: "shopping_checked",
      actor: context.actor.name,
      details: {
        shoppingItemId: updated.id,
        name: updated.name,
        checkedAt: updated.checkedAt,
      },
    });
  }

  return Response.json({ data: updated });
}

export async function handleDeleteShoppingItem(
  request: Request,
  { params }: Params,
  deps: DeleteShoppingDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { id } = await params;

  const existing = (await deps.readShoppingItems(context.houseId)).find((item) => item.id === id);
  if (!existing) {
    return errorResponse("Shopping item not found", 404, "SHOPPING_NOT_FOUND");
  }

  const canceledAt = getJstDateString();

  const updated = await deps.cancelShoppingItem(id, context.actor.name, canceledAt);
  if (!updated) {
    return errorResponse("Shopping item not found", 404, "SHOPPING_NOT_FOUND");
  }

  if (!existing.canceledAt && updated.canceledAt) {
    await logAppAuditEvent(deps, {
      houseId: context.houseId,
      action: "shopping_canceled",
      actor: context.actor.name,
      details: {
        shoppingItemId: updated.id,
        name: updated.name,
        canceledAt: updated.canceledAt,
      },
    });
  }

  return Response.json({ data: updated });
}
