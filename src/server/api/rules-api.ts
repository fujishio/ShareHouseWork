import type {
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
import { paginateByDateIdDesc } from "./cursor-pagination.ts";
import {
  errorResponse,
  readJsonBody,
  resolveHouseScopedContext,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

const ruleCategorySchema = z.enum(RULE_CATEGORIES);
const createRuleSchema = z.object({
  title: zNonEmptyTrimmedString.pipe(z.string().max(120)),
  body: zTrimmedString.pipe(z.string().max(2000)).default(""),
  category: ruleCategorySchema,
});
const updateRuleSchema = createRuleSchema;
const getRulesQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

type Params = { params: Promise<{ id: string }> };

export type GetRulesDeps = {
  readRules: (houseId: string) => Promise<Rule[]>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateRuleDeps = {
  appendRule: (input: CreateRuleInput) => Promise<Rule>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type UpdateRuleDeps = {
  updateRule: (id: string, input: UpdateRuleInput) => Promise<Rule | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type AcknowledgeRuleDeps = {
  acknowledgeRule: (id: string, actorName: string) => Promise<Rule | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type DeleteRuleDeps = {
  deleteRule: (id: string, actorName: string, deletedAt: string) => Promise<Rule | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export async function handleGetRules(request: Request, deps: GetRulesDeps) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { searchParams } = new URL(request.url);
  const parsedQuery = getRulesQuerySchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return validationError("Invalid query parameters", parsedQuery.error.issues);
  }

  const rules = await deps.readRules(context.houseId);
  const active = rules.filter((rule) => !rule.deletedAt);
  const page = paginateByDateIdDesc({
    items: active,
    getSortKey: (rule) => rule.createdAt,
    getId: (rule) => rule.id,
    limit: parsedQuery.data.limit,
    cursor: parsedQuery.data.cursor,
  });
  if (page.isInvalidCursor) {
    return errorResponse("Invalid cursor", 400, "VALIDATION_ERROR");
  }

  return Response.json({ data: page.data, page: { nextCursor: page.nextCursor } });
}

export async function handleCreateRule(request: Request, deps: CreateRuleDeps) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = createRuleSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "title") {
      return validationError("title is required", parsed.error.issues);
    }
    return validationError("Invalid category", parsed.error.issues);
  }

  const createdAt = deps.now();
  const input: CreateRuleInput = {
    houseId: context.houseId,
    title: parsed.data.title,
    body: parsed.data.body,
    category: parsed.data.category,
    createdBy: context.actor.name,
    createdAt,
  };

  const created = await deps.appendRule(input);

  await logAppAuditEvent(deps, {
    houseId: context.houseId,
    action: "rule_created",
    actor: context.actor.name,
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
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { id } = await params;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = updateRuleSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "title") {
      return validationError("title is required", parsed.error.issues);
    }
    return validationError("Invalid category", parsed.error.issues);
  }

  const input: UpdateRuleInput = {
    title: parsed.data.title,
    body: parsed.data.body,
    category: parsed.data.category,
    updatedAt: deps.now(),
  };

  const updated = await deps.updateRule(id, input);
  if (!updated) {
    return errorResponse("Rule not found", 404, "RULE_NOT_FOUND");
  }

  await logAppAuditEvent(deps, {
    houseId: context.houseId,
    action: "rule_updated",
    actor: context.actor.name,
    details: { ruleId: id, title: updated.title, category: parsed.data.category },
  });

  return Response.json({ data: updated });
}

export async function handleAcknowledgeRule(
  request: Request,
  { params }: Params,
  deps: AcknowledgeRuleDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { id } = await params;

  const updated = await deps.acknowledgeRule(id, context.actor.name);
  if (!updated) {
    return errorResponse("Rule not found", 404, "RULE_NOT_FOUND");
  }

  await logAppAuditEvent(deps, {
    houseId: context.houseId,
    action: "rule_acknowledged",
    actor: context.actor.name,
    details: { ruleId: id, title: updated.title },
  });

  return Response.json({ data: updated });
}

export async function handleDeleteRule(
  request: Request,
  { params }: Params,
  deps: DeleteRuleDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { id } = await params;

  const deletedAt = deps.now();
  const updated = await deps.deleteRule(id, context.actor.name, deletedAt);

  if (!updated) {
    return errorResponse("Rule not found", 404, "RULE_NOT_FOUND");
  }

  await logAppAuditEvent(deps, {
    houseId: context.houseId,
    action: "rule_deleted",
    actor: context.actor.name,
    details: { ruleId: id, title: updated.title },
  });

  return Response.json({ data: updated });
}
