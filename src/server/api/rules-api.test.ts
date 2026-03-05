import test from "node:test";
import assert from "node:assert/strict";
import {
  handleAcknowledgeRule,
  handleCreateRule,
  handleDeleteRule,
  handleGetRules,
  handleUpdateRule,
} from "./rules-api.ts";
import { encodeDateIdCursor } from "./cursor-pagination.ts";
import {
  createResolveActorHouseId,
  createVerifyRequest,
  defaultActor,
  unauthorizedResponse,
} from "./test-helpers.ts";
import type { AuditLogRecord, Rule } from "../../types/index.ts";

function buildDeps(options?: { actor?: typeof defaultActor | null; rules?: Rule[] }) {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  const rules = options?.rules ?? [];
  const auditLogs: Array<Omit<AuditLogRecord, "id">> = [];
  const verifyRequest = createVerifyRequest(actor);
  const resolveActorHouseId = createResolveActorHouseId();

  return {
    getDeps: {
      readRules: async () => rules,
      resolveActorHouseId,
      verifyRequest,
      unauthorizedResponse,
    },
    createDeps: {
      appendRule: async (input: Omit<Rule, "id">) => ({ id: "r-new", ...input }),
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      resolveActorHouseId,
      verifyRequest,
      unauthorizedResponse,
      now: () => "2026-03-02T00:00:00.000Z",
    },
    updateDeps: {
      updateRule: async (id: string) => {
        const item = rules.find((r) => r.id === id);
        return item ? { ...item, title: "更新後" } : null;
      },
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      resolveActorHouseId,
      verifyRequest,
      unauthorizedResponse,
      now: () => "2026-03-02T00:00:00.000Z",
    },
    acknowledgeDeps: {
      acknowledgeRule: async (id: string, actorName: string) => {
        const item = rules.find((r) => r.id === id);
        return item ? { ...item, acknowledgedBy: [actorName] } : null;
      },
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      resolveActorHouseId,
      verifyRequest,
      unauthorizedResponse,
      now: () => "2026-03-02T00:00:00.000Z",
    },
    deleteDeps: {
      deleteRule: async (id: string, actorName: string, deletedAt: string) => {
        const item = rules.find((r) => r.id === id);
        return item ? { ...item, deletedBy: actorName, deletedAt } : null;
      },
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      resolveActorHouseId,
      verifyRequest,
      unauthorizedResponse,
      now: () => "2026-03-02T00:00:00.000Z",
    },
    auditLogs,
  };
}

test("GET rules: 未認証は401", async () => {
  const { getDeps } = buildDeps({ actor: null });
  const response = await handleGetRules(new Request("http://localhost/api/rules"), getDeps);
  assert.equal(response.status, 401);
});

test("GET rules: deletedAt ありを除外", async () => {
  const rules: Rule[] = [
    {
      id: "r1",
      houseId: "house-id-001",
      title: "A",
      body: "",
      category: "共用部",
      createdBy: "あなた",
      createdAt: "2026-03-01",
    },
    {
      id: "r2",
      houseId: "house-id-001",
      title: "B",
      body: "",
      category: "共用部",
      createdBy: "あなた",
      createdAt: "2026-03-01",
      deletedAt: "2026-03-02",
    },
  ];
  const { getDeps } = buildDeps({ rules });
  const response = await handleGetRules(new Request("http://localhost/api/rules"), getDeps);
  const body = (await response.json()) as { data: Rule[] };

  assert.equal(response.status, 200);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0]?.id, "r1");
});

test("GET rules: cursorページングで次ページを取得できる", async () => {
  const rules: Rule[] = [
    {
      id: "r1",
      houseId: "house-id-001",
      title: "A",
      body: "",
      category: "共用部",
      createdBy: "あなた",
      createdAt: "2026-03-03T00:00:00.000Z",
    },
    {
      id: "r2",
      houseId: "house-id-001",
      title: "B",
      body: "",
      category: "共用部",
      createdBy: "あなた",
      createdAt: "2026-03-02T00:00:00.000Z",
    },
  ];
  const { getDeps } = buildDeps({ rules });
  const cursor = encodeDateIdCursor("2026-03-03T00:00:00.000Z", "r1");

  const response = await handleGetRules(
    new Request(`http://localhost/api/rules?limit=1&cursor=${cursor}`),
    getDeps
  );
  const body = (await response.json()) as { data: Rule[]; page: { nextCursor: string | null } };

  assert.equal(response.status, 200);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0]?.id, "r2");
  assert.equal(body.page.nextCursor, encodeDateIdCursor("2026-03-02T00:00:00.000Z", "r2"));
});

test("POST rules: category不正は400", async () => {
  const { createDeps } = buildDeps();
  const response = await handleCreateRule(
    new Request("http://localhost/api/rules", {
      method: "POST",
      body: JSON.stringify({ title: "A", body: "", category: "invalid" }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "Invalid category");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("POST rules: 不正JSONは400", async () => {
  const { createDeps } = buildDeps();
  const response = await handleCreateRule(
    new Request("http://localhost/api/rules", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "Invalid JSON");
  assert.equal(body.code, "INVALID_JSON");
});

test("POST rules: 正常系で監査ログ", async () => {
  const { createDeps, auditLogs } = buildDeps();
  const response = await handleCreateRule(
    new Request("http://localhost/api/rules", {
      method: "POST",
      body: JSON.stringify({ title: "A", body: "", category: "共用部" }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 201);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0]?.action, "rule_created");
});

test("PUT rules: not found は404", async () => {
  const { updateDeps } = buildDeps({ rules: [] });
  const response = await handleUpdateRule(
    new Request("http://localhost/api/rules/r1", {
      method: "PUT",
      body: JSON.stringify({ title: "B", body: "", category: "共用部" }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "r1" }) },
    updateDeps
  );

  assert.equal(response.status, 404);
});

test("PUT rules: title不足は400", async () => {
  const rules: Rule[] = [
    {
      id: "r1",
      houseId: "house-id-001",
      title: "A",
      body: "",
      category: "共用部",
      createdBy: "あなた",
      createdAt: "2026-03-01",
    },
  ];

  const { updateDeps } = buildDeps({ rules });
  const response = await handleUpdateRule(
    new Request("http://localhost/api/rules/r1", {
      method: "PUT",
      body: JSON.stringify({ title: " ", body: "", category: "共用部" }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "r1" }) },
    updateDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "title is required");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("PATCH rules: not foundは404", async () => {
  const { acknowledgeDeps } = buildDeps({ rules: [] });

  const response = await handleAcknowledgeRule(
    new Request("http://localhost/api/rules/r-missing", { method: "PATCH" }),
    { params: Promise.resolve({ id: "r-missing" }) },
    acknowledgeDeps
  );

  assert.equal(response.status, 404);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "Rule not found");
  assert.equal(body.code, "RULE_NOT_FOUND");
});

test("PATCH/DELETE rules: 正常系で監査ログ", async () => {
  const rules: Rule[] = [
    {
      id: "r1",
      houseId: "house-id-001",
      title: "A",
      body: "",
      category: "共用部",
      createdBy: "あなた",
      createdAt: "2026-03-01",
    },
  ];
  const { acknowledgeDeps, deleteDeps, auditLogs } = buildDeps({ rules });

  const patchRes = await handleAcknowledgeRule(
    new Request("http://localhost/api/rules/r1", { method: "PATCH" }),
    { params: Promise.resolve({ id: "r1" }) },
    acknowledgeDeps
  );
  assert.equal(patchRes.status, 200);

  const deleteRes = await handleDeleteRule(
    new Request("http://localhost/api/rules/r1", { method: "DELETE" }),
    { params: Promise.resolve({ id: "r1" }) },
    deleteDeps
  );
  assert.equal(deleteRes.status, 200);

  assert.equal(auditLogs.length, 2);
  assert.equal(auditLogs[0]?.action, "rule_acknowledged");
  assert.equal(auditLogs[1]?.action, "rule_deleted");
});
