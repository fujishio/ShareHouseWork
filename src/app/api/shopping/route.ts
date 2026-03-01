import { NextResponse } from "next/server";
import { readShoppingItems, appendShoppingItem } from "@/server/shopping-store";
import {
  getJstDateString,
  isTrimmedNonEmpty,
  normalizeShoppingDate,
} from "@/domain/shopping/shopping-api-validation";
import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import type { CreateShoppingItemInput, ExpenseCategory } from "@/types";

export async function GET() {
  const items = await readShoppingItems();
  return NextResponse.json({ data: items });
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
    typeof (body as Record<string, unknown>).name !== "string"
  ) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const normalizedName = String(raw.name).trim();
  if (!isTrimmedNonEmpty(normalizedName)) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const normalizedAddedAt =
    typeof raw.addedAt === "string"
      ? normalizeShoppingDate(raw.addedAt)
      : getJstDateString();
  if (!normalizedAddedAt) {
    return NextResponse.json({ error: "Invalid addedAt date" }, { status: 400 });
  }

  const normalizedAddedBy =
    typeof raw.addedBy === "string" && isTrimmedNonEmpty(raw.addedBy)
      ? raw.addedBy.trim()
      : "不明";

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
    addedBy: normalizedAddedBy,
    addedAt: normalizedAddedAt,
  };

  const created = await appendShoppingItem(input);
  return NextResponse.json({ data: created }, { status: 201 });
}
