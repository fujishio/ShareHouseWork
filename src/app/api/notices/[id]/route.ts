import { NextResponse } from "next/server";
import { deleteNotice } from "@/server/notice-store";
import { appendAuditLog } from "@/server/audit-log-store";
import { isValidMemberName } from "@/shared/constants/house";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const noticeId = Number(id);
  if (!Number.isInteger(noticeId) || noticeId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const rawDeletedBy = typeof raw.deletedBy === "string" ? raw.deletedBy.trim() : "";
  if (!rawDeletedBy || !isValidMemberName(rawDeletedBy)) {
    return NextResponse.json({ error: "deletedBy must be a valid member name" }, { status: 400 });
  }
  const deletedBy = rawDeletedBy;

  const deletedAt = new Date().toISOString();
  const updated = await deleteNotice(noticeId, deletedBy, deletedAt);

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await appendAuditLog({
    action: "notice_deleted",
    actor: deletedBy,
    source: "app",
    createdAt: new Date().toISOString(),
    details: { noticeId, title: updated.title },
  });

  return NextResponse.json({ data: updated });
}
