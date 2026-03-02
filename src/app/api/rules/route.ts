import { handleCreateRule, handleGetRules } from "@/server/api/rules-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { appendRule, readRules } from "@/server/rule-store";

const getDeps = {
  readRules,
  verifyRequest,
  unauthorizedResponse,
};

const createDeps = {
  appendRule,
  appendAuditLog,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function GET(request: Request) {
  return handleGetRules(request, getDeps);
}

export async function POST(request: Request) {
  return handleCreateRule(request, createDeps);
}
