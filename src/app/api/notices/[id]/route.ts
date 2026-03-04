import { handleDeleteNotice } from "@/server/api/notices-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import { deleteNotice } from "@/server/notice-store";

const deps = {
  deleteNotice,
  appendAuditLog,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleDeleteNotice(request, context, deps);
}
