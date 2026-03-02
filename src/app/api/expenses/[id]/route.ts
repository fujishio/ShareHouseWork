import { NextResponse } from "next/server";
import { appendAuditLog } from "@/server/audit-log-store";
import { cancelExpense, readExpenses } from "@/server/expense-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { isTrimmedNonEmpty } from "@/domain/expenses/expense-api-validation";

type ExpenseDeleteDeps = {
  appendAuditLog: typeof appendAuditLog;
  cancelExpense: typeof cancelExpense;
  readExpenses: typeof readExpenses;
  verifyRequest: typeof verifyRequest;
  unauthorizedResponse: typeof unauthorizedResponse;
  now: () => string;
};

const defaultDeps: ExpenseDeleteDeps = {
  appendAuditLog,
  cancelExpense,
  readExpenses,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function handleDeleteExpense(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  deps: ExpenseDeleteDeps = defaultDeps
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
    return NextResponse.json({ error: "cancelReason is required" }, { status: 400 });
  }

  const canceledAt = deps.now();
  const existing = (await deps.readExpenses()).find((expense) => expense.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
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

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleDeleteExpense(request, context);
}
