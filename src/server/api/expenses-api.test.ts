import test from "node:test";
import assert from "node:assert/strict";
import {
  handleCreateExpense,
  handleDeleteExpense,
  handleGetExpenses,
} from "./expenses-api.ts";
import type { AuditLogRecord, ExpenseRecord } from "../../types/index.ts";

type Actor = { uid: string; name: string; email: string };
const defaultActor: Actor = { uid: "u1", name: "あなた", email: "you@example.com" };

function buildDeps(options?: { actor?: Actor | null; expenses?: ExpenseRecord[] }) {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  const expenses = options?.expenses ?? [];
  const auditLogs: Array<Omit<AuditLogRecord, "id">> = [];
  const cancelCalls: Array<{ id: string; reason: string; canceledBy: string; canceledAt: string }> = [];

  return {
    getDeps: {
      readExpenses: async () => expenses,
      verifyRequest: async () => {
        if (!actor) throw new Error("unauthorized");
        return actor;
      },
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    },
    createDeps: {
      appendExpense: async (input: Omit<ExpenseRecord, "id">) => ({ id: "e-new", ...input }),
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      verifyRequest: async () => {
        if (!actor) throw new Error("unauthorized");
        return actor;
      },
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
      now: () => "2026-03-02T00:00:00.000Z",
    },
    deleteDeps: {
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      cancelExpense: async (
        id: string,
        input: { canceledBy: string; cancelReason: string },
        canceledAt: string
      ) => {
        cancelCalls.push({ id, reason: input.cancelReason, canceledBy: input.canceledBy, canceledAt });
        const existing = expenses.find((item) => item.id === id);
        if (!existing) return null;
        return { ...existing, canceledAt, canceledBy: input.canceledBy, cancelReason: input.cancelReason };
      },
      readExpenses: async () => expenses,
      verifyRequest: async () => {
        if (!actor) throw new Error("unauthorized");
        return actor;
      },
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
      now: () => "2026-03-02T00:00:00.000Z",
    },
    auditLogs,
    cancelCalls,
  };
}

test("GET expenses: 未認証は401", async () => {
  const { getDeps } = buildDeps({ actor: null });
  const response = await handleGetExpenses(new Request("http://localhost/api/expenses"), getDeps);
  assert.equal(response.status, 401);
});

test("POST expenses: 不正categoryは400", async () => {
  const { createDeps } = buildDeps();
  const response = await handleCreateExpense(
    new Request("http://localhost/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        title: "電気代",
        amount: 1000,
        category: "invalid",
        purchasedAt: "2026-03-01",
      }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "Invalid category");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("POST expenses: 正常系で監査ログを追加", async () => {
  const { createDeps, auditLogs } = buildDeps();
  const response = await handleCreateExpense(
    new Request("http://localhost/api/expenses", {
      method: "POST",
      body: JSON.stringify({
        title: " 電気代 ",
        amount: 1000,
        category: "水道・光熱費",
        purchasedAt: "2026-03-01",
      }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 201);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0]?.action, "expense_created");
});

test("DELETE expenses: cancelReason不足は400", async () => {
  const { deleteDeps } = buildDeps();
  const response = await handleDeleteExpense(
    new Request("http://localhost/api/expenses/e1", {
      method: "DELETE",
      body: JSON.stringify({ cancelReason: "   " }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "e1" }) },
    deleteDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "cancelReason is required");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("DELETE expenses: 正常系で取消と監査ログを追加", async () => {
  const expenses: ExpenseRecord[] = [
    {
      id: "e1",
      title: "電気代",
      amount: 1000,
      category: "水道・光熱費",
      purchasedBy: "あなた",
      purchasedAt: "2026-03-01",
    },
  ];
  const { deleteDeps, auditLogs, cancelCalls } = buildDeps({ expenses });

  const response = await handleDeleteExpense(
    new Request("http://localhost/api/expenses/e1", {
      method: "DELETE",
      body: JSON.stringify({ cancelReason: "重複" }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "e1" }) },
    deleteDeps
  );

  assert.equal(response.status, 200);
  assert.equal(cancelCalls.length, 1);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0]?.action, "expense_canceled");
});
