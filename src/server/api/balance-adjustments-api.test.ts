import test from "node:test";
import assert from "node:assert/strict";
import {
  handleCreateBalanceAdjustment,
  handleGetBalanceAdjustments,
} from "./balance-adjustments-api.ts";
import type { AuditLogRecord, BalanceAdjustmentRecord } from "../../types/index.ts";

type Actor = { uid: string; name: string; email: string };
const defaultActor: Actor = { uid: "u1", name: "あなた", email: "you@example.com" };

function buildDeps(options?: { actor?: Actor | null; adjustments?: BalanceAdjustmentRecord[] }) {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  const adjustments = options?.adjustments ?? [];
  const auditLogs: Array<Omit<AuditLogRecord, "id">> = [];

  const resolveActorHouseId = async () => "house-id-001";

  return {
    getDeps: {
      readBalanceAdjustments: async (_houseId: string, _month?: string) => adjustments,
      resolveActorHouseId,
      verifyRequest: async () => {
        if (!actor) throw new Error("unauthorized");
        return actor;
      },
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    },
    createDeps: {
      appendBalanceAdjustment: async (
        input: Omit<BalanceAdjustmentRecord, "id">
      ) => ({ id: "ba-new", ...input }),
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      now: () => "2026-03-02T00:00:00.000Z",
      resolveActorHouseId,
      verifyRequest: async () => {
        if (!actor) throw new Error("unauthorized");
        return actor;
      },
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    },
    auditLogs,
  };
}

test("GET balance adjustments: 未認証は401", async () => {
  const { getDeps } = buildDeps({ actor: null });
  const response = await handleGetBalanceAdjustments(
    new Request("http://localhost/api/balance-adjustments"),
    getDeps
  );
  assert.equal(response.status, 401);
});

test("POST balance adjustments: amountが0は400", async () => {
  const { createDeps } = buildDeps();
  const response = await handleCreateBalanceAdjustment(
    new Request("http://localhost/api/balance-adjustments", {
      method: "POST",
      body: JSON.stringify({
        amount: 0,
        reason: "精算",
        adjustedAt: "2026-03-01",
      }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "amount must be a non-zero number");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("POST balance adjustments: adjustedAt不正は400", async () => {
  const { createDeps } = buildDeps();
  const response = await handleCreateBalanceAdjustment(
    new Request("http://localhost/api/balance-adjustments", {
      method: "POST",
      body: JSON.stringify({
        amount: 1000,
        reason: "精算",
        adjustedAt: "invalid-date",
      }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "Invalid adjustedAt date");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("POST balance adjustments: 正常系で監査ログを追加", async () => {
  const { createDeps, auditLogs } = buildDeps();
  const response = await handleCreateBalanceAdjustment(
    new Request("http://localhost/api/balance-adjustments", {
      method: "POST",
      body: JSON.stringify({
        amount: -1200,
        reason: " 現金差額調整 ",
        adjustedAt: "2026-03-01",
      }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 201);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0]?.action, "balance_adjustment_created");
});
