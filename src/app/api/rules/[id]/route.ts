import {
  handleAcknowledgeRule,
  handleDeleteRule,
  handleUpdateRule,
} from "@/server/api/rules-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import { acknowledgeRule, deleteRule, readRule, updateRule } from "@/server/rule-store";

const updateDeps = {
  readRule,
  updateRule,
  appendAuditLog,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

const acknowledgeDeps = {
  readRule,
  acknowledgeRule,
  appendAuditLog,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

const deleteDeps = {
  readRule,
  deleteRule,
  appendAuditLog,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateRule(request, context, updateDeps);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleAcknowledgeRule(request, context, acknowledgeDeps);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleDeleteRule(request, context, deleteDeps);
}
