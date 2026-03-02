import test from "node:test";
import assert from "node:assert/strict";
import {
  handleAcknowledgeRule,
  handleCreateRule,
  handleDeleteRule,
  handleGetRules,
  handleUpdateRule,
} from "./rules-api.ts";
import type { AuditLogRecord, Rule } from "../../types/index.ts";

type Actor = { uid: string; name: string; email: string };
const defaultActor: Actor = { uid: "u1", name: "あなた", email: "you@example.com" };

function buildDeps(options?: { actor?: Actor | null; rules?: Rule[] }) {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  const rules = options?.rules ?? [];
  const auditLogs: Array<Omit<AuditLogRecord, "id">> = [];

  const verifyRequest = async () => {
    if (!actor) throw new Error("unauthorized");
    return actor;
  };

  return {
    getDeps: {
      readRules: async () => rules,
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    },
    createDeps: {
      appendRule: async (input: Omit<Rule, "id">) => ({ id: "r-new", ...input }),
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
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
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
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
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
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
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
      now: () => "2026-03-02T00:00:00.000Z",
    },
    auditLogs,
  };
}

test("GET rules: deletedAt ありを除外", async () => {
  const rules: Rule[] = [
    {
      id: "r1",
      title: "A",
      body: "",
      category: "共用部",
      createdBy: "あなた",
      createdAt: "2026-03-01",
    },
    {
      id: "r2",
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
  assert.deepEqual(await response.json(), { error: "Invalid category" });
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

test("PATCH/DELETE rules: 正常系で監査ログ", async () => {
  const rules: Rule[] = [
    {
      id: "r1",
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
