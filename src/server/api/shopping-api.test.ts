import test from "node:test";
import assert from "node:assert/strict";
import {
  handleCreateShoppingItem,
  handleDeleteShoppingItem,
  handleGetShoppingItems,
  handlePatchShoppingItem,
} from "./shopping-api.ts";
import type { AuditLogRecord, ShoppingItem } from "../../types/index.ts";

type Actor = { uid: string; name: string; email: string };
const defaultActor: Actor = { uid: "u1", name: "あなた", email: "you@example.com" };

function buildDeps(options?: { actor?: Actor | null; items?: ShoppingItem[] }) {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  const items = options?.items ?? [];
  const auditLogs: Array<Omit<AuditLogRecord, "id">> = [];

  const verifyRequest = async () => {
    if (!actor) throw new Error("unauthorized");
    return actor;
  };

  return {
    getDeps: {
      readShoppingItems: async () => items,
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    },
    createDeps: {
      appendShoppingItem: async (input: Omit<ShoppingItem, "id">) => ({ id: "s-new", ...input }),
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
      now: () => "2026-03-02T00:00:00.000Z",
    },
    patchDeps: {
      readShoppingItems: async () => items,
      checkShoppingItem: async (id: string, input: { checkedBy: string }, checkedAt: string) => {
        const item = items.find((x) => x.id === id);
        return item ? { ...item, checkedBy: input.checkedBy, checkedAt } : null;
      },
      uncheckShoppingItem: async (id: string) => {
        const item = items.find((x) => x.id === id);
        if (!item) return null;
        const { checkedAt: _a, checkedBy: _b, ...rest } = item;
        return rest;
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
      readShoppingItems: async () => items,
      cancelShoppingItem: async (id: string, canceledBy: string, canceledAt: string) => {
        const item = items.find((x) => x.id === id);
        return item ? { ...item, canceledBy, canceledAt } : null;
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

test("GET shopping: 未認証は401", async () => {
  const { getDeps } = buildDeps({ actor: null });
  const response = await handleGetShoppingItems(new Request("http://localhost/api/shopping"), getDeps);
  assert.equal(response.status, 401);
});

test("POST shopping: name不足は400", async () => {
  const { createDeps } = buildDeps();
  const response = await handleCreateShoppingItem(
    new Request("http://localhost/api/shopping", {
      method: "POST",
      body: JSON.stringify({ name: "   " }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "name is required");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("POST shopping: 正常系で作成と監査ログ", async () => {
  const { createDeps, auditLogs } = buildDeps();
  const response = await handleCreateShoppingItem(
    new Request("http://localhost/api/shopping", {
      method: "POST",
      body: JSON.stringify({ name: "洗剤", quantity: "1", memo: "", addedAt: "2026-03-01" }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 201);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0]?.action, "shopping_created");
});

test("PATCH shopping: uncheckで監査ログ", async () => {
  const items: ShoppingItem[] = [
    {
      id: "s1",
      name: "洗剤",
      quantity: "1",
      memo: "",
      addedBy: "あなた",
      addedAt: "2026-03-01",
      checkedBy: "あなた",
      checkedAt: "2026-03-01",
    },
  ];
  const { patchDeps, auditLogs } = buildDeps({ items });

  const response = await handlePatchShoppingItem(
    new Request("http://localhost/api/shopping/s1", {
      method: "PATCH",
      body: JSON.stringify({ uncheck: true }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "s1" }) },
    patchDeps
  );

  assert.equal(response.status, 200);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0]?.action, "shopping_unchecked");
});

test("DELETE shopping: 正常系で取消と監査ログ", async () => {
  const items: ShoppingItem[] = [
    {
      id: "s1",
      name: "洗剤",
      quantity: "1",
      memo: "",
      addedBy: "あなた",
      addedAt: "2026-03-01",
    },
  ];
  const { deleteDeps, auditLogs } = buildDeps({ items });

  const response = await handleDeleteShoppingItem(
    new Request("http://localhost/api/shopping/s1", { method: "DELETE" }),
    { params: Promise.resolve({ id: "s1" }) },
    deleteDeps
  );

  assert.equal(response.status, 200);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0]?.action, "shopping_canceled");
});
