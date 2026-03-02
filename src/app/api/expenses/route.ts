import { NextResponse } from "next/server";
import { readExpenses, appendExpense } from "@/server/expense-store";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import {
  isTrimmedNonEmpty,
  normalizePurchasedAt,
} from "@/domain/expenses/expense-api-validation";
import type { CreateExpenseInput, ExpenseCategory } from "@/types";

type ExpensesRouteDeps = {
  readExpenses: typeof readExpenses;
  appendExpense: typeof appendExpense;
  appendAuditLog: typeof appendAuditLog;
  verifyRequest: typeof verifyRequest;
  unauthorizedResponse: typeof unauthorizedResponse;
  now: () => string;
};

const defaultDeps: ExpensesRouteDeps = {
  readExpenses,
  appendExpense,
  appendAuditLog,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function handleGetExpenses(request: Request, deps: ExpensesRouteDeps = defaultDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const expenses = await deps.readExpenses();
  return NextResponse.json({ data: expenses });
}

export async function handleCreateExpense(
  request: Request,
  deps: ExpensesRouteDeps = defaultDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  if (
    typeof raw.title !== "string" ||
    typeof raw.amount !== "number" ||
    typeof raw.category !== "string" ||
    typeof raw.purchasedAt !== "string"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  if (!isTrimmedNonEmpty(raw.title)) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (raw.amount <= 0 || !Number.isFinite(raw.amount)) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  if (!EXPENSE_CATEGORIES.includes(raw.category as ExpenseCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const normalizedPurchasedAt = normalizePurchasedAt(raw.purchasedAt);
  if (!normalizedPurchasedAt) {
    return NextResponse.json({ error: "Invalid purchasedAt date" }, { status: 400 });
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

  return NextResponse.json({ data: created }, { status: 201 });
}

export async function GET(request: Request) {
  return handleGetExpenses(request);
}

export async function POST(request: Request) {
  return handleCreateExpense(request);
}
