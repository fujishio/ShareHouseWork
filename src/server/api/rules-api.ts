import type {
  ApiErrorResponse,
  AuditLogRecord,
  CreateRuleInput,
  Rule,
  UpdateRuleInput,
} from "../../types/index.ts";
import { z } from "zod";
import {
  zNonEmptyTrimmedString,
  zTrimmedString,
} from "../../shared/lib/api-validation.ts";
import { RULE_CATEGORIES } from "../../shared/constants/rule.ts";
import { logAppAuditEvent } from "./audit-log-service.ts";

const ruleCategorySchema = z.enum(RULE_CATEGORIES);
const createRuleSchema = z.object({
  title: zNonEmptyTrimmedString,
  body: zTrimmedString.default(""),
  category: ruleCategorySchema,
});
const updateRuleSchema = createRuleSchema;

type Params = { params: Promise<{ id: string }> };
type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

export type GetRulesDeps = {
  readRules: () => Promise<Rule[]>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateRuleDeps = {
  appendRule: (input: CreateRuleInput) => Promise<Rule>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type UpdateRuleDeps = {
  updateRule: (id: string, input: UpdateRuleInput) => Promise<Rule | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type AcknowledgeRuleDeps = {
  acknowledgeRule: (id: string, actorName: string) => Promise<Rule | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type DeleteRuleDeps = {
  deleteRule: (id: string, actorName: string, deletedAt: string) => Promise<Rule | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

function errorResponse(
  error: string,
  status: number,
  code: string,
  details?: unknown
) {
  return Response.json({ error, code, details } satisfies ApiErrorResponse, { status });
}

export async function handleGetRules(request: Request, deps: GetRulesDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const rules = await deps.readRules();
  const active = rules.filter((r) => !r.deletedAt);
  return Response.json({ data: active });
}

export async function handleCreateRule(request: Request, deps: CreateRuleDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400, "INVALID_JSON");
  }

  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "title") {
      return errorResponse("title is required", 400, "VALIDATION_ERROR", parsed.error.issues);
    }
    return errorResponse("Invalid category", 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const createdAt = deps.now();
  const input: CreateRuleInput = {
    title: parsed.data.title,
    body: parsed.data.body,
    category: parsed.data.category,
    createdBy: actor.name,
    createdAt,
  };

  const created = await deps.appendRule(input);

  await logAppAuditEvent(deps, {
    action: "rule_created",
    actor: actor.name,
    details: {
      ruleId: created.id,
      title: created.title,
      category: parsed.data.category,
    },
  });

  return Response.json({ data: created }, { status: 201 });
}

export async function handleUpdateRule(
  request: Request,
  { params }: Params,
  deps: UpdateRuleDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400, "INVALID_JSON");
  }

  const parsed = updateRuleSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "title") {
      return errorResponse("title is required", 400, "VALIDATION_ERROR", parsed.error.issues);
    }
    return errorResponse("Invalid category", 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const input: UpdateRuleInput = {
    title: parsed.data.title,
    body: parsed.data.body,
    category: parsed.data.category,
    updatedAt: deps.now(),
  };

  const updated = await deps.updateRule(id, input);
  if (!updated) {
    return errorResponse("Not found", 404, "RULE_NOT_FOUND");
  }

  await logAppAuditEvent(deps, {
    action: "rule_updated",
    actor: actor.name,
    details: { ruleId: id, title: updated.title, category: parsed.data.category },
  });

  return Response.json({ data: updated });
}

export async function handleAcknowledgeRule(
  request: Request,
  { params }: Params,
  deps: AcknowledgeRuleDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { id } = await params;

  const updated = await deps.acknowledgeRule(id, actor.name);
  if (!updated) {
    return errorResponse("Not found", 404, "RULE_NOT_FOUND");
  }

  await logAppAuditEvent(deps, {
    action: "rule_acknowledged",
    actor: actor.name,
    details: { ruleId: id, title: updated.title },
  });

  return Response.json({ data: updated });
}

export async function handleDeleteRule(
  request: Request,
  { params }: Params,
  deps: DeleteRuleDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { id } = await params;

  const deletedAt = deps.now();
  const updated = await deps.deleteRule(id, actor.name, deletedAt);

  if (!updated) {
    return errorResponse("Not found", 404, "RULE_NOT_FOUND");
  }

  await logAppAuditEvent(deps, {
    action: "rule_deleted",
    actor: actor.name,
    details: { ruleId: id, title: updated.title },
  });

  return Response.json({ data: updated });
}
