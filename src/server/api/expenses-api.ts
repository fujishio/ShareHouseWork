import { EXPENSE_CATEGORIES } from "../../domain/expenses/expense-categories.ts";
import {
  isTrimmedNonEmpty,
  normalizePurchasedAt,
} from "../../domain/expenses/expense-api-validation.ts";
import type {
  AuditLogRecord,
  CreateExpenseInput,
  ExpenseCategory,
  ExpenseRecord,
} from "../../types/index.ts";

type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

export type GetExpensesDeps = {
  readExpenses: () => Promise<ExpenseRecord[]>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateExpenseDeps = {
  appendExpense: (input: CreateExpenseInput) => Promise<ExpenseRecord>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type DeleteExpenseDeps = {
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  cancelExpense: (
    id: string,
    input: { canceledBy: string; cancelReason: string },
    canceledAt: string
  ) => Promise<ExpenseRecord | null>;
  readExpenses: () => Promise<ExpenseRecord[]>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export async function handleGetExpenses(request: Request, deps: GetExpensesDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const expenses = await deps.readExpenses();
  return Response.json({ data: expenses });
}

export async function handleCreateExpense(
  request: Request,
  deps: CreateExpenseDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  if (
    typeof raw.title !== "string" ||
    typeof raw.amount !== "number" ||
    typeof raw.category !== "string" ||
    typeof raw.purchasedAt !== "string"
  ) {
    return Response.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  if (!isTrimmedNonEmpty(raw.title)) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  if (raw.amount <= 0 || !Number.isFinite(raw.amount)) {
    return Response.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  if (!EXPENSE_CATEGORIES.includes(raw.category as ExpenseCategory)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const normalizedPurchasedAt = normalizePurchasedAt(raw.purchasedAt);
  if (!normalizedPurchasedAt) {
    return Response.json({ error: "Invalid purchasedAt date" }, { status: 400 });
  }

  const input: CreateExpenseInput = {
    title: raw.title.trim(),
    amount: raw.amount,
    category: raw.category as ExpenseCategory,
    purchasedBy: actor.name,
    purchasedAt: normalizedPurchasedAt,
  };

  const created = await deps.appendExpense(input);

  await deps.appendAuditLog({
    action: "expense_created",
    actor: actor.name,
    source: "app",
    createdAt: deps.now(),
    details: {
      expenseId: created.id,
      title: created.title,
      amount: created.amount,
      category: created.category,
      purchasedAt: created.purchasedAt,
    },
  });

  return Response.json({ data: created }, { status: 201 });
}

export async function handleDeleteExpense(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  deps: DeleteExpenseDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const raw =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const cancelReason = typeof raw.cancelReason === "string" ? raw.cancelReason.trim() : "";

  if (!isTrimmedNonEmpty(cancelReason)) {
    return Response.json({ error: "cancelReason is required" }, { status: 400 });
  }

  const canceledAt = deps.now();
  const existing = (await deps.readExpenses()).find((expense) => expense.id === id);
  if (!existing) {
    return Response.json({ error: "Expense not found" }, { status: 404 });
  }

  const updated = await deps.cancelExpense(
    id,
    {
      canceledBy: actor.name,
      cancelReason,
    },
    canceledAt
  );

  if (!updated) {
    return Response.json({ error: "Expense not found" }, { status: 404 });
  }

  if (!existing.canceledAt && updated.canceledAt) {
    await deps.appendAuditLog({
      action: "expense_canceled",
      actor: actor.name,
      source: "app",
      createdAt: canceledAt,
      details: {
        expenseId: updated.id,
        title: updated.title,
        amount: updated.amount,
        category: updated.category,
        cancelReason,
      },
    });
  }

  return Response.json({ data: updated });
}
