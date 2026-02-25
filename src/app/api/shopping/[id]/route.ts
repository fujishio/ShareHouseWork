import { NextResponse } from "next/server";
import {
  checkShoppingItem,
  uncheckShoppingItem,
  cancelShoppingItem,
} from "@/server/shopping-store";
import {
  getJstDateString,
  isTrimmedNonEmpty,
} from "@/domain/shopping/shopping-api-validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  if (raw.uncheck === true) {
    const updated = await uncheckShoppingItem(itemId);
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  }

  const checkedBy =
    typeof raw.checkedBy === "string" && isTrimmedNonEmpty(raw.checkedBy)
      ? raw.checkedBy.trim()
      : "不明";
  const checkedAt = getJstDateString();

  const updated = await checkShoppingItem(itemId, { checkedBy }, checkedAt);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const raw =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const canceledBy =
    typeof raw.canceledBy === "string" && isTrimmedNonEmpty(raw.canceledBy)
      ? raw.canceledBy.trim()
      : "不明";
  const canceledAt = getJstDateString();

  const updated = await cancelShoppingItem(itemId, canceledBy, canceledAt);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
