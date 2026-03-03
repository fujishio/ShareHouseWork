import test from "node:test";
import assert from "node:assert/strict";
import {
  handleCreateNotice,
  handleDeleteNotice,
  handleGetNotices,
} from "./notices-api.ts";
import type { AuditLogRecord, Notice } from "../../types/index.ts";

type Actor = { uid: string; name: string; email: string };
const defaultActor: Actor = { uid: "u1", name: "あなた", email: "you@example.com" };

function buildDeps(options?: { actor?: Actor | null; notices?: Notice[] }) {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  const notices = options?.notices ?? [];
  const auditLogs: Array<Omit<AuditLogRecord, "id">> = [];

  const verifyRequest = async () => {
    if (!actor) throw new Error("unauthorized");
    return actor;
  };

  return {
    getDeps: {
      readNotices: async () => notices,
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    },
    createDeps: {
      appendNotice: async (input: Omit<Notice, "id" | "deletedAt" | "deletedBy">) => ({
        id: "n-new",
        ...input,
      }),
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `a-${auditLogs.length}`, ...record };
      },
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
      now: () => "2026-03-02T00:00:00.000Z",
    },
    deleteDeps: {
      deleteNotice: async (id: string, deletedBy: string, deletedAt: string) => {
        const notice = notices.find((item) => item.id === id);
        return notice ? { ...notice, deletedBy, deletedAt } : null;
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

test("GET notices: deletedAt ありを除外", async () => {
  const notices: Notice[] = [
    {
      id: "n1",
      title: "A",
      body: "",
      postedBy: "あなた",
      postedAt: "2026-03-01T00:00:00.000Z",
      isImportant: false,
    },
    {
      id: "n2",
      title: "B",
      body: "",
      postedBy: "あなた",
      postedAt: "2026-03-01T00:00:00.000Z",
      isImportant: false,
      deletedAt: "2026-03-02T00:00:00.000Z",
      deletedBy: "あなた",
    },
  ];

  const { getDeps } = buildDeps({ notices });
  const response = await handleGetNotices(new Request("http://localhost/api/notices"), getDeps);
  const body = (await response.json()) as { data: Notice[] };

  assert.equal(response.status, 200);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0]?.id, "n1");
});

test("POST notices: title不足は400", async () => {
  const { createDeps } = buildDeps();
  const response = await handleCreateNotice(
    new Request("http://localhost/api/notices", {
      method: "POST",
      body: JSON.stringify({ title: " ", body: "", isImportant: false }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "title is required");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("POST/DELETE notices: 正常系で監査ログ", async () => {
  const notices: Notice[] = [
    {
      id: "n1",
      title: "A",
      body: "",
      postedBy: "あなた",
      postedAt: "2026-03-01T00:00:00.000Z",
      isImportant: true,
    },
  ];

  const { createDeps, deleteDeps, auditLogs } = buildDeps({ notices });

  const createRes = await handleCreateNotice(
    new Request("http://localhost/api/notices", {
      method: "POST",
      body: JSON.stringify({ title: "お知らせ", body: "", isImportant: true }),
      headers: { "content-type": "application/json" },
    }),
    createDeps
  );
  assert.equal(createRes.status, 201);

  const deleteRes = await handleDeleteNotice(
    new Request("http://localhost/api/notices/n1", { method: "DELETE" }),
    { params: Promise.resolve({ id: "n1" }) },
    deleteDeps
  );
  assert.equal(deleteRes.status, 200);

  assert.equal(auditLogs.length, 2);
  assert.equal(auditLogs[0]?.action, "notice_created");
  assert.equal(auditLogs[1]?.action, "notice_deleted");
});
