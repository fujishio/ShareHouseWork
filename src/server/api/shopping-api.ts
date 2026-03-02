import { EXPENSE_CATEGORIES } from "../../domain/expenses/expense-categories.ts";
import {
  getJstDateString,
  isTrimmedNonEmpty,
  normalizeShoppingDate,
} from "../../domain/shopping/shopping-api-validation.ts";
import type {
  AuditLogRecord,
  CreateShoppingItemInput,
  ExpenseCategory,
  ShoppingItem,
} from "../../types/index.ts";

type Params = { params: Promise<{ id: string }> };
type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

export type GetShoppingDeps = {
  readShoppingItems: () => Promise<ShoppingItem[]>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateShoppingDeps = {
  appendShoppingItem: (input: CreateShoppingItemInput) => Promise<ShoppingItem>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type PatchShoppingDeps = {
  readShoppingItems: () => Promise<ShoppingItem[]>;
  checkShoppingItem: (
    id: string,
    input: { checkedBy: string },
    checkedAt: string
  ) => Promise<ShoppingItem | null>;
  uncheckShoppingItem: (id: string) => Promise<ShoppingItem | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type DeleteShoppingDeps = {
  readShoppingItems: () => Promise<ShoppingItem[]>;
  cancelShoppingItem: (
    id: string,
    canceledBy: string,
    canceledAt: string
  ) => Promise<ShoppingItem | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export async function handleGetShoppingItems(request: Request, deps: GetShoppingDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const items = await deps.readShoppingItems();
  return Response.json({ data: items });
}

export async function handleCreateShoppingItem(
  request: Request,
  deps: CreateShoppingDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).name !== "string"
  ) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const normalizedName = String(raw.name).trim();
  if (!isTrimmedNonEmpty(normalizedName)) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const normalizedAddedAt =
    typeof raw.addedAt === "string"
      ? normalizeShoppingDate(raw.addedAt)
      : getJstDateString();
  if (!normalizedAddedAt) {
    return Response.json({ error: "Invalid addedAt date" }, { status: 400 });
  }

  const rawCategory = raw.category;
  const category =
    typeof rawCategory === "string" && EXPENSE_CATEGORIES.includes(rawCategory as ExpenseCategory)
      ? (rawCategory as ExpenseCategory)
      : undefined;

  const input: CreateShoppingItemInput = {
    name: normalizedName,
    quantity: typeof raw.quantity === "string" ? raw.quantity.trim() : "1",
    memo: typeof raw.memo === "string" ? raw.memo.trim() : "",
    category,
    addedBy: actor.name,
    addedAt: normalizedAddedAt,
  };

  const created = await deps.appendShoppingItem(input);

  await deps.appendAuditLog({
    action: "shopping_created",
    actor: actor.name,
    source: "app",
    createdAt: deps.now(),
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

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  const existing = (await deps.readShoppingItems()).find((item) => item.id === id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (raw.uncheck === true) {
    const updated = await deps.uncheckShoppingItem(id);
    if (!updated) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.checkedAt && !existing.canceledAt) {
      await deps.appendAuditLog({
        action: "shopping_unchecked",
        actor: actor.name,
        source: "app",
        createdAt: deps.now(),
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
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!existing.checkedAt && !existing.canceledAt && updated.checkedAt) {
    await deps.appendAuditLog({
      action: "shopping_checked",
      actor: actor.name,
      source: "app",
      createdAt: deps.now(),
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

  const { id } = await params;

  const existing = (await deps.readShoppingItems()).find((item) => item.id === id);
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const canceledAt = getJstDateString();

  const updated = await deps.cancelShoppingItem(id, actor.name, canceledAt);
  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!existing.canceledAt && updated.canceledAt) {
    await deps.appendAuditLog({
      action: "shopping_canceled",
      actor: actor.name,
      source: "app",
      createdAt: deps.now(),
      details: {
        shoppingItemId: updated.id,
        name: updated.name,
        canceledAt: updated.canceledAt,
      },
    });
  }

  return Response.json({ data: updated });
}
