import {
  handleCreateBalanceAdjustment,
  handleGetBalanceAdjustments,
} from "@/server/api/balance-adjustments-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import {
  appendBalanceAdjustment,
  readBalanceAdjustments,
} from "@/server/balance-adjustment-store";

export const runtime = "nodejs";

const getDeps = {
  readBalanceAdjustments,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

const createDeps = {
  appendBalanceAdjustment,
  appendAuditLog,
  now: () => new Date().toISOString(),
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

export async function GET(request: Request) {
  return handleGetBalanceAdjustments(request, getDeps);
}

export async function POST(request: Request) {
  return handleCreateBalanceAdjustment(request, createDeps);
}
