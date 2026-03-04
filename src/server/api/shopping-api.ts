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
  ApiErrorResponse,
  AuditLogRecord,
  CreateShoppingItemInput,
  ShoppingItem,
} from "../../types/index.ts";
import { z } from "zod";
import { logAppAuditEvent } from "./audit-log-service.ts";

type Params = { params: Promise<{ id: string }> };
type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

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
  name: zNonEmptyTrimmedString,
  quantity: zTrimmedString.default("1"),
  memo: zTrimmedString.default(""),
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

function errorResponse(
  error: string,
  status: number,
  code: string,
  details?: unknown
) {
  return Response.json({ error, code, details } satisfies ApiErrorResponse, { status });
}

export async function handleGetShoppingItems(request: Request, deps: GetShoppingDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");

  const items = await deps.readShoppingItems(houseId);
  return Response.json({ data: items });
}

export async function handleCreateShoppingItem(
  request: Request,
  deps: CreateShoppingDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400, "INVALID_JSON");
  }

  const parsed = createShoppingSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "addedAt") {
      return errorResponse("Invalid addedAt date", 400, "VALIDATION_ERROR", parsed.error.issues);
    }
    return errorResponse("name is required", 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const input: CreateShoppingItemInput = {
    houseId,
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    memo: parsed.data.memo,
    category: parsed.data.category,
    addedBy: actor.name,
    addedAt: parsed.data.addedAt,
  };

  const created = await deps.appendShoppingItem(input);

  await logAppAuditEvent(deps, {
    houseId,
    action: "shopping_created",
    actor: actor.name,
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
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400, "INVALID_JSON");
  }

  const parsed = patchShoppingSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid JSON", 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const existing = (await deps.readShoppingItems(houseId)).find((item) => item.id === id);
  if (!existing) {
    return errorResponse("Not found", 404, "SHOPPING_NOT_FOUND");
  }

  if (parsed.data.uncheck === true) {
    const updated = await deps.uncheckShoppingItem(id);
    if (!updated) {
      return errorResponse("Not found", 404, "SHOPPING_NOT_FOUND");
    }

    if (existing.checkedAt && !existing.canceledAt) {
      await logAppAuditEvent(deps, {
        houseId,
        action: "shopping_unchecked",
        actor: actor.name,
        details: {
          shoppingItemId: updated.id,
          name: updated.name,
        },
      });
    }
    return Response.json({ data: updated });
  }

  const checkedAt = getJstDateString();

  const updated = await deps.checkShoppingItem(id, { checkedBy: actor.name }, checkedAt);
  if (!updated) {
    return errorResponse("Not found", 404, "SHOPPING_NOT_FOUND");
  }

  if (!existing.checkedAt && !existing.canceledAt && updated.checkedAt) {
    await logAppAuditEvent(deps, {
      houseId,
      action: "shopping_checked",
      actor: actor.name,
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
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");

  const { id } = await params;

  const existing = (await deps.readShoppingItems(houseId)).find((item) => item.id === id);
  if (!existing) {
    return errorResponse("Not found", 404, "SHOPPING_NOT_FOUND");
  }

  const canceledAt = getJstDateString();

  const updated = await deps.cancelShoppingItem(id, actor.name, canceledAt);
  if (!updated) {
    return errorResponse("Not found", 404, "SHOPPING_NOT_FOUND");
  }

  if (!existing.canceledAt && updated.canceledAt) {
    await logAppAuditEvent(deps, {
      houseId,
      action: "shopping_canceled",
      actor: actor.name,
      details: {
        shoppingItemId: updated.id,
        name: updated.name,
        canceledAt: updated.canceledAt,
      },
    });
  }

  return Response.json({ data: updated });
}
