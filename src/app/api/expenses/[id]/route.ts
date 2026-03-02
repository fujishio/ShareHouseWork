import { NextResponse } from "next/server";
import { cancelExpense } from "@/server/expense-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { isTrimmedNonEmpty } from "@/domain/expenses/expense-api-validation";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

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

  const canceledAt = new Date().toISOString();
  const updated = await cancelExpense(
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

  return NextResponse.json({ data: updated });
}
