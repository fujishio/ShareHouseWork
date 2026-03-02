import { NextResponse } from "next/server";
import { readExpenses, appendExpense } from "@/server/expense-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import {
  isTrimmedNonEmpty,
  normalizePurchasedAt,
} from "@/domain/expenses/expense-api-validation";
import type { CreateExpenseInput, ExpenseCategory } from "@/types";

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const expenses = await readExpenses();
  return NextResponse.json({ data: expenses });
}

export async function POST(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

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

  const created = await appendExpense(input);
  return NextResponse.json({ data: created }, { status: 201 });
}
