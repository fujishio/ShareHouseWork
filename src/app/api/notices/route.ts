import {
  handleCreateNotice,
  handleGetNotices,
} from "@/server/api/notices-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import { appendNotice, readNotices } from "@/server/notice-store";

export const runtime = "nodejs";

const getDeps = {
  readNotices,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

const createDeps = {
  appendNotice,
  appendAuditLog,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function GET(request: Request) {
  return handleGetNotices(request, getDeps);
}

export async function POST(request: Request) {
  return handleCreateNotice(request, createDeps);
}
