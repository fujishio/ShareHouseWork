import { NextResponse } from "next/server";
import { appendAuditLog } from "@/server/audit-log-store";
import {
  readShoppingItems,
  checkShoppingItem,
  uncheckShoppingItem,
  cancelShoppingItem,
} from "@/server/shopping-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import {
  getJstDateString,
} from "@/domain/shopping/shopping-api-validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

  const existing = (await readShoppingItems()).find((item) => item.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (raw.uncheck === true) {
    const updated = await uncheckShoppingItem(id);
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.checkedAt && !existing.canceledAt) {
      await appendAuditLog({
        action: "shopping_unchecked",
        actor: actor.name,
        source: "app",
        createdAt: new Date().toISOString(),
        details: {
          shoppingItemId: updated.id,
          name: updated.name,
        },
      });
    }
    return NextResponse.json({ data: updated });
  }

  const checkedAt = getJstDateString();

  const updated = await checkShoppingItem(id, { checkedBy: actor.name }, checkedAt);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!existing.checkedAt && !existing.canceledAt && updated.checkedAt) {
    await appendAuditLog({
      action: "shopping_checked",
      actor: actor.name,
      source: "app",
      createdAt: new Date().toISOString(),
      details: {
        shoppingItemId: updated.id,
        name: updated.name,
        checkedAt: updated.checkedAt,
      },
    });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: Request, { params }: Params) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;

  const existing = (await readShoppingItems()).find((item) => item.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canceledAt = getJstDateString();

  const updated = await cancelShoppingItem(id, actor.name, canceledAt);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!existing.canceledAt && updated.canceledAt) {
    await appendAuditLog({
      action: "shopping_canceled",
      actor: actor.name,
      source: "app",
      createdAt: new Date().toISOString(),
      details: {
        shoppingItemId: updated.id,
        name: updated.name,
        canceledAt: updated.canceledAt,
      },
    });
  }

  return NextResponse.json({ data: updated });
}
