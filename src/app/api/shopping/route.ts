import { NextResponse } from "next/server";
import { readShoppingItems, appendShoppingItem } from "@/server/shopping-store";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import {
  getJstDateString,
  isTrimmedNonEmpty,
  normalizeShoppingDate,
} from "@/domain/shopping/shopping-api-validation";
import { EXPENSE_CATEGORIES } from "@/domain/expenses/expense-categories";
import type { CreateShoppingItemInput, ExpenseCategory } from "@/types";

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const items = await readShoppingItems();
  return NextResponse.json({ data: items });
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

  const created = await appendShoppingItem(input);

  await appendAuditLog({
    action: "shopping_created",
    actor: actor.name,
    source: "app",
    createdAt: new Date().toISOString(),
    details: {
      shoppingItemId: created.id,
      name: created.name,
      quantity: created.quantity,
      category: created.category ?? null,
      addedAt: created.addedAt,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
