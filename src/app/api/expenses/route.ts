import { NextResponse } from "next/server";
import { readExpenses, appendExpense } from "@/server/expense-store";
import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import {
  isTrimmedNonEmpty,
  normalizePurchasedAt,
} from "@/domain/expenses/expense-api-validation";
import type { CreateExpenseInput, ExpenseCategory } from "@/types";
import { isValidMemberName } from "@/shared/constants/house";

export async function GET() {
  const expenses = await readExpenses();
  return NextResponse.json({ data: expenses });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as CreateExpenseInput).title !== "string" ||
    typeof (body as CreateExpenseInput).amount !== "number" ||
    typeof (body as CreateExpenseInput).category !== "string" ||
    typeof (body as CreateExpenseInput).purchasedBy !== "string" ||
    typeof (body as CreateExpenseInput).purchasedAt !== "string"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const input = body as CreateExpenseInput;

  if (!isTrimmedNonEmpty(input.title)) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!isTrimmedNonEmpty(input.purchasedBy) || !isValidMemberName(input.purchasedBy.trim())) {
    return NextResponse.json({ error: "purchasedBy must be a valid member name" }, { status: 400 });
  }

  if (input.amount <= 0 || !Number.isFinite(input.amount)) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  if (!EXPENSE_CATEGORIES.includes(input.category as ExpenseCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const normalizedPurchasedAt = normalizePurchasedAt(input.purchasedAt);
  if (!normalizedPurchasedAt) {
    return NextResponse.json({ error: "Invalid purchasedAt date" }, { status: 400 });
  }

  const created = await appendExpense({
    ...input,
    purchasedBy: input.purchasedBy.trim(),
    purchasedAt: normalizedPurchasedAt,
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
