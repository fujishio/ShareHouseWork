import {
  handleAcknowledgeRule,
  handleDeleteRule,
  handleUpdateRule,
} from "@/server/api/rules-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import { acknowledgeRule, deleteRule, updateRule } from "@/server/rule-store";

const updateDeps = {
  updateRule,
  appendAuditLog,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

const acknowledgeDeps = {
  acknowledgeRule,
  appendAuditLog,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

const deleteDeps = {
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
