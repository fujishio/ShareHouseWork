import type {
  AuditLogRecord,
  CreateRuleInput,
  Rule,
  RuleCategory,
  UpdateRuleInput,
} from "../../types/index.ts";

const VALID_CATEGORIES: RuleCategory[] = [
  "ゴミ捨て",
  "騒音",
  "共用部",
  "来客",
  "その他",
];

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
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  const body_ = typeof raw.body === "string" ? raw.body.trim() : "";

  const category = raw.category as RuleCategory;
  if (!VALID_CATEGORIES.includes(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const createdAt = deps.now();
  const input: CreateRuleInput = {
    title,
    body: body_,
    category,
    createdBy: actor.name,
    createdAt,
  };

  const created = await deps.appendRule(input);

  await deps.appendAuditLog({
    action: "rule_created",
    actor: actor.name,
    source: "app",
    createdAt: deps.now(),
    details: { ruleId: created.id, title: created.title, category },
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
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  if (typeof raw.category !== "string" || !VALID_CATEGORIES.includes(raw.category as RuleCategory)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  const category = raw.category as RuleCategory;

  const input: UpdateRuleInput = {
    title,
    body: typeof raw.body === "string" ? raw.body.trim() : "",
    category,
    updatedAt: deps.now(),
  };

  const updated = await deps.updateRule(id, input);
  if (!updated) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await deps.appendAuditLog({
    action: "rule_updated",
    actor: actor.name,
    source: "app",
    createdAt: deps.now(),
    details: { ruleId: id, title: updated.title, category },
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
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await deps.appendAuditLog({
    action: "rule_acknowledged",
    actor: actor.name,
    source: "app",
    createdAt: deps.now(),
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
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await deps.appendAuditLog({
    action: "rule_deleted",
    actor: actor.name,
    source: "app",
    createdAt: deps.now(),
    details: { ruleId: id, title: updated.title },
  });

  return Response.json({ data: updated });
}
