import test from "node:test";
import assert from "node:assert/strict";
import {
  handleCreateShoppingItem,
  handleDeleteShoppingItem,
  handleGetShoppingItems,
  handlePatchShoppingItem,
} from "./shopping-api.ts";
import { encodeDateIdCursor } from "./cursor-pagination.ts";
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

  const resolveActorHouseId = async () => "house-id-001";

  return {
    getDeps: {
      readShoppingItems: async () => items,
      resolveActorHouseId,
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    },
    createDeps: {
      appendShoppingItem: async (input: Omit<ShoppingItem, "id">) => ({ id: "s-new", ...input }),
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      resolveActorHouseId,
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
      resolveActorHouseId,
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
      resolveActorHouseId,
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

test("GET shopping: cursorページングで次ページを取得できる", async () => {
  const items: ShoppingItem[] = [
    {
      id: "s1",
      houseId: "house-id-001",
      name: "洗剤",
      quantity: "1",
      memo: "",
      addedBy: "あなた",
      addedAt: "2026-03-03",
    },
    {
      id: "s2",
      houseId: "house-id-001",
      name: "ティッシュ",
      quantity: "1",
      memo: "",
      addedBy: "あなた",
      addedAt: "2026-03-02",
    },
  ];
  const { getDeps } = buildDeps({ items });
  const cursor = encodeDateIdCursor("2026-03-03", "s1");

  const response = await handleGetShoppingItems(
    new Request(`http://localhost/api/shopping?limit=1&cursor=${cursor}`),
    getDeps
  );
  const body = (await response.json()) as { data: ShoppingItem[]; page: { nextCursor: string | null } };

  assert.equal(response.status, 200);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0]?.id, "s2");
  assert.equal(body.page.nextCursor, encodeDateIdCursor("2026-03-02", "s2"));
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

test("POST shopping: addedAt不正は400", async () => {
  const { createDeps } = buildDeps();
  const response = await handleCreateShoppingItem(
    new Request("http://localhost/api/shopping", {
      method: "POST",
      body: JSON.stringify({ name: "洗剤", addedAt: "invalid-date" }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "Invalid addedAt date");
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
      houseId: "house-id-001",
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

test("PATCH shopping: not foundは404", async () => {
  const { patchDeps } = buildDeps({ items: [] });

  const response = await handlePatchShoppingItem(
    new Request("http://localhost/api/shopping/s-missing", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "s-missing" }) },
    patchDeps
  );

  assert.equal(response.status, 404);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "Shopping item not found");
  assert.equal(body.code, "SHOPPING_NOT_FOUND");
});

test("PATCH shopping: checkで監査ログ", async () => {
  const items: ShoppingItem[] = [
    {
      id: "s1",
      houseId: "house-id-001",
      name: "洗剤",
      quantity: "1",
      memo: "",
      addedBy: "あなた",
      addedAt: "2026-03-01",
    },
  ];
  const { patchDeps, auditLogs } = buildDeps({ items });

  const response = await handlePatchShoppingItem(
    new Request("http://localhost/api/shopping/s1", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "s1" }) },
    patchDeps
  );

  assert.equal(response.status, 200);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0]?.action, "shopping_checked");
});

test("DELETE shopping: not foundは404", async () => {
  const { deleteDeps } = buildDeps({ items: [] });

  const response = await handleDeleteShoppingItem(
    new Request("http://localhost/api/shopping/s-missing", { method: "DELETE" }),
    { params: Promise.resolve({ id: "s-missing" }) },
    deleteDeps
  );

  assert.equal(response.status, 404);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "Shopping item not found");
  assert.equal(body.code, "SHOPPING_NOT_FOUND");
});

test("DELETE shopping: 正常系で取消と監査ログ", async () => {
  const items: ShoppingItem[] = [
    {
      id: "s1",
      houseId: "house-id-001",
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
