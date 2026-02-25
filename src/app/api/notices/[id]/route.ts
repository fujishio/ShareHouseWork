import { NextResponse } from "next/server";
import { deleteNotice } from "@/server/notice-store";

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
  const deletedBy =
    typeof raw.deletedBy === "string" && raw.deletedBy.trim()
      ? raw.deletedBy.trim()
      : "不明";

  const deletedAt = new Date().toISOString();
  const updated = await deleteNotice(noticeId, deletedBy, deletedAt);

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
