import test from "node:test";
import assert from "node:assert/strict";
import {
  handleCreateNotice,
  handleDeleteNotice,
  handleGetNotices,
} from "./notices-api.ts";
import { encodeDateIdCursor } from "./cursor-pagination.ts";
import {
  createResolveActorHouseId,
  createVerifyRequest,
  defaultActor,
  unauthorizedResponse,
} from "./test-helpers.ts";
import type { AuditLogRecord, Notice } from "../../types/index.ts";

function buildDeps(options?: { actor?: typeof defaultActor | null; notices?: Notice[] }) {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  const notices = options?.notices ?? [];
  const auditLogs: Array<Omit<AuditLogRecord, "id">> = [];
  const verifyRequest = createVerifyRequest(actor);
  const resolveActorHouseId = createResolveActorHouseId();

  return {
    getDeps: {
      readNotices: async () => notices,
      resolveActorHouseId,
      verifyRequest,
      unauthorizedResponse,
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
      resolveActorHouseId,
      verifyRequest,
      unauthorizedResponse,
      now: () => "2026-03-02T00:00:00.000Z",
    },
    deleteDeps: {
      readNotice: async (id: string) => notices.find((item) => item.id === id) ?? null,
      deleteNotice: async (id: string, deletedBy: string, deletedAt: string) => {
        const notice = notices.find((item) => item.id === id);
        return notice ? { ...notice, deletedBy, deletedAt } : null;
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

test("GET notices: 未認証は401", async () => {
  const { getDeps } = buildDeps({ actor: null });
  const response = await handleGetNotices(new Request("http://localhost/api/notices"), getDeps);
  assert.equal(response.status, 401);
});

test("GET notices: deletedAt ありを除外", async () => {
  const notices: Notice[] = [
    {
      id: "n1",
      houseId: "house-id-001",
      title: "A",
      body: "",
      postedBy: "あなた",
      postedAt: "2026-03-01T00:00:00.000Z",
      isImportant: false,
    },
    {
      id: "n2",
      houseId: "house-id-001",
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

test("GET notices: cursorページングで次ページを取得できる", async () => {
  const notices: Notice[] = [
    {
      id: "n1",
      houseId: "house-id-001",
      title: "1",
      body: "",
      postedBy: "あなた",
      postedAt: "2026-03-03T00:00:00.000Z",
      isImportant: false,
    },
    {
      id: "n2",
      houseId: "house-id-001",
      title: "2",
      body: "",
      postedBy: "あなた",
      postedAt: "2026-03-02T00:00:00.000Z",
      isImportant: false,
    },
  ];
  const { getDeps } = buildDeps({ notices });
  const cursor = encodeDateIdCursor("2026-03-03T00:00:00.000Z", "n1");

  const response = await handleGetNotices(
    new Request(`http://localhost/api/notices?limit=1&cursor=${cursor}`),
    getDeps
  );
  const body = (await response.json()) as { data: Notice[]; page: { nextCursor: string | null } };

  assert.equal(response.status, 200);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0]?.id, "n2");
  assert.equal(body.page.nextCursor, encodeDateIdCursor("2026-03-02T00:00:00.000Z", "n2"));
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

test("POST notices: 不正JSONは400", async () => {
  const { createDeps } = buildDeps();
  const response = await handleCreateNotice(
    new Request("http://localhost/api/notices", {
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

test("DELETE notices: not foundは404", async () => {
  const { deleteDeps } = buildDeps({ notices: [] });
  const response = await handleDeleteNotice(
    new Request("http://localhost/api/notices/n-missing", { method: "DELETE" }),
    { params: Promise.resolve({ id: "n-missing" }) },
    deleteDeps
  );

  assert.equal(response.status, 404);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "Notice not found");
  assert.equal(body.code, "NOTICE_NOT_FOUND");
});

test("DELETE notices: 別ハウスのお知らせは403", async () => {
  const otherHouseNotice: Notice = {
    id: "n-other",
    houseId: "other-house-id",
    title: "他ハウスのお知らせ",
    body: "",
    postedBy: "他の人",
    postedAt: "2026-03-01T00:00:00.000Z",
    isImportant: false,
  };
  const { deleteDeps } = buildDeps({ notices: [otherHouseNotice] });
  const response = await handleDeleteNotice(
    new Request("http://localhost/api/notices/n-other", { method: "DELETE" }),
    { params: Promise.resolve({ id: "n-other" }) },
    deleteDeps
  );

  assert.equal(response.status, 403);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.code, "FORBIDDEN");
});

test("POST/DELETE notices: 正常系で監査ログ", async () => {
  const notices: Notice[] = [
    {
      id: "n1",
      houseId: "house-id-001",
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
