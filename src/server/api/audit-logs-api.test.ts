import test from "node:test";
import assert from "node:assert/strict";
import { handleGetAuditLogs } from "./audit-logs-api.ts";
import {
  createResolveActorHouseId,
  createVerifyRequest,
  defaultActor,
  unauthorizedResponse,
} from "./test-helpers.ts";
import type { AuditLogRecord } from "../../types/index.ts";

function buildDeps(options?: { actor?: typeof defaultActor | null; logs?: AuditLogRecord[] }) {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  const logs = options?.logs ?? [];
  let receivedOptions:
    | { from?: Date; to?: Date; action?: string; cursor?: string; limit?: number }
    | null = null;
  const verifyRequest = createVerifyRequest(actor);

  return {
    deps: {
      readAuditLogs: async (
        _houseId: string,
        opts: { from?: Date; to?: Date; action?: string; cursor?: string; limit?: number }
      ) => {
        receivedOptions = opts;
        return logs;
      },
      createAuditLogCursor: (record: Pick<AuditLogRecord, "id" | "createdAt">) =>
        `cursor:${record.createdAt}:${record.id}`,
      resolveActorHouseId: createResolveActorHouseId(),
      verifyRequest,
      unauthorizedResponse,
    },
    getReceivedOptions: () => receivedOptions,
  };
}

test("GET audit-logs: 未認証は401", async () => {
  const { deps } = buildDeps({ actor: null });
  const response = await handleGetAuditLogs(
    new Request("http://localhost/api/audit-logs"),
    deps
  );

  assert.equal(response.status, 401);
});

test("GET audit-logs: クエリとcursorがStoreへ渡され、nextCursorが返る", async () => {
  const logs: AuditLogRecord[] = [
    {
      id: "a1",
      houseId: "house-id-001",
      action: "task_completion_created",
      actor: "あなた",
      actorUid: "uid-test",
      source: "app",
      createdAt: "2026-03-05T00:00:00.000Z",
      details: {},
    },
    {
      id: "a2",
      houseId: "house-id-001",
      action: "notice_created",
      actor: "あなた",
      actorUid: "uid-test",
      source: "app",
      createdAt: "2026-03-04T00:00:00.000Z",
      details: {},
    },
  ];
  const { deps, getReceivedOptions } = buildDeps({ logs });

  const response = await handleGetAuditLogs(
    new Request(
      "http://localhost/api/audit-logs?from=2026-03-01&to=2026-03-31&action=task_completed&cursor=abc&limit=2"
    ),
    deps
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    data: AuditLogRecord[];
    page: { nextCursor: string | null };
  };
  assert.equal(body.data.length, 2);
  assert.equal(body.page.nextCursor, "cursor:2026-03-04T00:00:00.000Z:a2");

  const received = getReceivedOptions();
  assert.ok(received);
  assert.equal(received?.action, "task_completed");
  assert.equal(received?.cursor, "abc");
  assert.equal(received?.limit, 2);
});

test("GET audit-logs: limit未満ならnextCursorはnull", async () => {
  const logs: AuditLogRecord[] = [
    {
      id: "a1",
      houseId: "house-id-001",
      action: "task_completion_created",
      actor: "あなた",
      actorUid: "uid-test",
      source: "app",
      createdAt: "2026-03-05T00:00:00.000Z",
      details: {},
    },
  ];
  const { deps } = buildDeps({ logs });

  const response = await handleGetAuditLogs(
    new Request("http://localhost/api/audit-logs?limit=2"),
    deps
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as { page: { nextCursor: string | null } };
  assert.equal(body.page.nextCursor, null);
});

test("GET audit-logs: 不正クエリは400", async () => {
  const { deps } = buildDeps();
  const response = await handleGetAuditLogs(
    new Request("http://localhost/api/audit-logs?limit=0"),
    deps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { code?: string };
  assert.equal(body.code, "VALIDATION_ERROR");
});
