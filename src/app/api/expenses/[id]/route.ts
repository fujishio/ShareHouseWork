import { NextResponse } from "next/server";
import { cancelExpense } from "@/server/expense-store";
import { isTrimmedNonEmpty } from "@/domain/expenses/expense-api-validation";
import type { CancelExpenseInput } from "@/types";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expenseId = Number(id);

  if (!Number.isInteger(expenseId) || expenseId <= 0) {
    return NextResponse.json({ error: "Invalid expense id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as CancelExpenseInput).canceledBy !== "string" ||
    typeof (body as CancelExpenseInput).cancelReason !== "string"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const input = body as CancelExpenseInput;
  if (!isTrimmedNonEmpty(input.canceledBy) || !isTrimmedNonEmpty(input.cancelReason)) {
    return NextResponse.json({ error: "canceledBy and cancelReason are required" }, { status: 400 });
  }

  const canceledAt = new Date().toISOString();
  const updated = await cancelExpense(
    expenseId,
    {
      canceledBy: input.canceledBy.trim(),
      cancelReason: input.cancelReason.trim(),
    },
    canceledAt
  );

  if (!updated) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
