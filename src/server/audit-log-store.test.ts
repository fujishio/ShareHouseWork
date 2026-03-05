import test from "node:test";
import assert from "node:assert/strict";
import { createAuditLog, createAuditLogCursor, listAuditLogs } from "./audit-log-store.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("listAuditLogs: 条件・cursor・limit をクエリへ反映", async () => {
  const fake = createFakeFirestoreDb({
    auditLogs: {
      a1: {
        houseId: "h1",
        action: "task_completed",
        actor: "あなた",
        source: "app",
        createdAt: "2026-03-05T00:00:00.000Z",
        details: {},
      },
    },
  });
  const cursor = createAuditLogCursor({ id: "a1", createdAt: "2026-03-05T00:00:00.000Z" });

  const logs = await listAuditLogs(
    "h1",
    {
      action: "task_completed",
      from: new Date("2026-03-01T00:00:00.000Z"),
      to: new Date("2026-03-31T23:59:59.999Z"),
      limit: 10,
      cursor,
    },
    fake.db
  );

  assert.equal(logs.length, 1);
  assert.equal(fake.calls.where.length, 4);
  assert.equal(fake.calls.orderBy.length, 2);
  assert.equal(fake.calls.limit[0]?.value, 10);
  assert.equal(fake.calls.startAfter.length, 1);
});

test("createAuditLog: details を保存して返す", async () => {
  const fake = createFakeFirestoreDb({ auditLogs: {} });

  const created = await createAuditLog(
    {
      houseId: "h1",
      action: "rule_created",
      actor: "あなた",
      source: "app",
      createdAt: "2026-03-05T00:00:00.000Z",
      details: { target: "rule" },
    },
    fake.db
  );

  assert.equal(created.id, "new-1");
  assert.deepEqual(fake.seed.auditLogs?.["new-1"]?.details, { target: "rule" });
});
