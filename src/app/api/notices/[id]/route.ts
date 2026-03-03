import { NextResponse } from "next/server";
import { deleteNotice } from "@/server/notice-store";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type { ApiErrorResponse } from "@/types";
import { createApiError } from "@/shared/lib/api-validation";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const { id } = await params;

  const deletedAt = new Date().toISOString();
  const updated = await deleteNotice(id, actor.name, deletedAt);

  if (!updated) {
    return NextResponse.json(
      createApiError("Not found", "NOTICE_NOT_FOUND", { noticeId: id }),
      { status: 404 }
    ) as NextResponse<ApiErrorResponse>;
  }

  await appendAuditLog({
    action: "notice_deleted",
    actor: actor.name,
    source: "app",
    createdAt: new Date().toISOString(),
    details: { noticeId: id, title: updated.title },
  });

  return NextResponse.json({ data: updated });
}
