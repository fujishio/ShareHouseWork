import test from "node:test";
import assert from "node:assert/strict";
import {
  handleCancelTaskCompletion,
  handleCreateTaskCompletion,
  handleGetTaskCompletions,
} from "./task-completions-api.ts";
import type { AuditLogRecord, Task, TaskCompletionRecord } from "../../types/index.ts";

type Actor = { uid: string; name: string; email: string };

const defaultActor: Actor = {
  uid: "u1",
  name: "あなた",
  email: "you@example.com",
};

function buildDeps(options?: {
  actor?: Actor | null;
  tasks?: Task[];
  completions?: TaskCompletionRecord[];
}) {
  const auditLogs: Omit<AuditLogRecord, "id">[] = [];
  const createdPayloads: Array<Omit<TaskCompletionRecord, "id">> = [];
  const canceledCalls: Array<{
    id: string;
    canceledBy: string;
    cancelReason: string;
    canceledAt: string;
  }> = [];

  const tasks = options?.tasks ?? [];
  const completions = options?.completions ?? [];
  const actor = options?.actor === undefined ? defaultActor : options.actor;

  return {
    deps: {
      readTasks: async () => tasks,
      readTaskCompletions: async () => completions,
      appendTaskCompletion: async (record: Omit<TaskCompletionRecord, "id">) => {
        createdPayloads.push(record);
        return { id: "completion-new", ...record };
      },
      cancelTaskCompletion: async (
        id: string,
        canceledBy: string,
        cancelReason: string,
        canceledAt: string
      ) => {
        canceledCalls.push({ id, canceledBy, cancelReason, canceledAt });
        const existing = completions.find((item) => item.id === id);
        if (!existing) return null;
        return { ...existing, canceledBy, cancelReason, canceledAt };
      },
      appendAuditLog: async (record: Omit<AuditLogRecord, "id">) => {
        auditLogs.push(record);
        return { id: `audit-${auditLogs.length}`, ...record };
      },
      resolveActorHouseId: async () => "house-id-001",
      verifyRequest: async () => {
        if (!actor) {
          throw new Error("unauthorized");
        }
        return actor;
      },
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
      now: () => "2026-03-02T00:00:00.000Z",
    },
    auditLogs,
    createdPayloads,
    canceledCalls,
  };
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

test("GET: 未認証は401", async () => {
  const { deps } = buildDeps({ actor: null });
  const response = await handleGetTaskCompletions(
    new Request("http://localhost/api/task-completions"),
    deps
  );

  assert.equal(response.status, 401);
  const body = (await readJson(response)) as { error?: string };
  assert.equal(body.error, "Unauthorized");
});

test("GET: from/to/filter/sort/limit が適用される", async () => {
  const completions: TaskCompletionRecord[] = [
    {
      id: "c1",
      houseId: "house-id-001",
      taskId: "t1",
      taskName: "A",
      points: 10,
      completedBy: "あなた",
      completedAt: "2026-02-10T00:00:00.000Z",
      source: "app",
    },
    {
      id: "c2",
      houseId: "house-id-001",
      taskId: "t1",
      taskName: "A",
      points: 10,
      completedBy: "あなた",
      completedAt: "2026-02-20T00:00:00.000Z",
      source: "app",
    },
    {
      id: "c3",
      houseId: "house-id-001",
      taskId: "t1",
      taskName: "A",
      points: 10,
      completedBy: "あなた",
      completedAt: "invalid-date",
      source: "app",
    },
  ];

  const { deps } = buildDeps({ completions });

  const response = await handleGetTaskCompletions(
    new Request(
      "http://localhost/api/task-completions?from=2026-02-01T00:00:00.000Z&to=2026-02-28T23:59:59.999Z&limit=1"
    ),
    deps
  );

  assert.equal(response.status, 200);

  const body = (await readJson(response)) as { data: TaskCompletionRecord[] };
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0]?.id, "c2");
});

test("GET: 不正なfromクエリは400", async () => {
  const { deps } = buildDeps();
  const response = await handleGetTaskCompletions(
    new Request("http://localhost/api/task-completions?from=abc"),
    deps
  );

  assert.equal(response.status, 400);
  const body = (await readJson(response)) as { error?: string; code?: string };
  assert.equal(body.error, "Invalid from query. Use ISO date string.");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("GET: 不正なtoクエリは400", async () => {
  const { deps } = buildDeps();
  const response = await handleGetTaskCompletions(
    new Request("http://localhost/api/task-completions?to=abc"),
    deps
  );

  assert.equal(response.status, 400);
  const body = (await readJson(response)) as { error?: string; code?: string };
  assert.equal(body.error, "Invalid to query. Use ISO date string.");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("GET: limitは200にクランプされる", async () => {
  const completions: TaskCompletionRecord[] = Array.from({ length: 210 }, (_, index) => ({
    id: `c${index}`,
    houseId: "house-id-001",
    taskId: "t1",
    taskName: "A",
    points: 10,
    completedBy: "あなた",
    completedAt: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
    source: "app" as const,
  }));
  const { deps } = buildDeps({ completions });

  const response = await handleGetTaskCompletions(
    new Request("http://localhost/api/task-completions?limit=999"),
    deps
  );

  assert.equal(response.status, 200);
  const body = (await readJson(response)) as { data: TaskCompletionRecord[] };
  assert.equal(body.data.length, 200);
});

test("POST: 不正payloadは400", async () => {
  const { deps } = buildDeps();
  const response = await handleCreateTaskCompletion(
    new Request("http://localhost/api/task-completions", {
      method: "POST",
      body: JSON.stringify(null),
      headers: { "content-type": "application/json" },
    }),
    deps
  );

  assert.equal(response.status, 400);
  const body = (await readJson(response)) as { error?: string; code?: string };
  assert.equal(
    body.error,
    "Invalid payload. Required: taskId(string), completedAt(ISO string), source(app)"
  );
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("POST: 存在しないtaskIdは404", async () => {
  const { deps } = buildDeps({ tasks: [] });
  const response = await handleCreateTaskCompletion(
    new Request("http://localhost/api/task-completions", {
      method: "POST",
      body: JSON.stringify({
        taskId: "missing",
        completedAt: "2026-03-01T10:00:00.000Z",
        source: "app",
      }),
      headers: { "content-type": "application/json" },
    }),
    deps
  );

  assert.equal(response.status, 404);
  const body = (await readJson(response)) as { error?: string; code?: string };
  assert.equal(body.error, "taskId does not exist.");
  assert.equal(body.code, "TASK_NOT_FOUND");
});

test("POST: 正常系で完了記録と監査ログを作成", async () => {
  const tasks: Task[] = [
    {
      id: "t1",
      houseId: "house-id-001",
      name: "風呂掃除",
      points: 20,
      category: "水回りの掃除",
      frequencyDays: 3,
    },
  ];

  const { deps, auditLogs, createdPayloads } = buildDeps({ tasks });

  const response = await handleCreateTaskCompletion(
    new Request("http://localhost/api/task-completions", {
      method: "POST",
      body: JSON.stringify({
        taskId: "t1",
        completedAt: "2026-03-01T10:00:00.000Z",
        source: "app",
      }),
      headers: { "content-type": "application/json" },
    }),
    deps
  );

  assert.equal(response.status, 201);
  assert.equal(createdPayloads.length, 1);
  assert.deepEqual(createdPayloads[0], {
    houseId: "house-id-001",
    taskId: "t1",
    taskName: "風呂掃除",
    points: 20,
    completedBy: "あなた",
    completedAt: "2026-03-01T10:00:00.000Z",
    source: "app",
  });

  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0]?.action, "task_completion_created");
  assert.equal(auditLogs[0]?.details.taskId, "t1");
});

test("PATCH: cancelReasonが空は400", async () => {
  const { deps } = buildDeps();

  const response = await handleCancelTaskCompletion(
    new Request("http://localhost/api/task-completions/c1", {
      method: "PATCH",
      body: JSON.stringify({ cancelReason: "   " }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "c1" }) },
    deps
  );

  assert.equal(response.status, 400);
  const body = (await readJson(response)) as { error?: string; code?: string };
  assert.equal(body.error, "cancelReason is required.");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("PATCH: 不正JSONは400", async () => {
  const { deps } = buildDeps();

  const response = await handleCancelTaskCompletion(
    new Request("http://localhost/api/task-completions/c1", {
      method: "PATCH",
      body: "{",
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "c1" }) },
    deps
  );

  assert.equal(response.status, 400);
  const body = (await readJson(response)) as { error?: string; code?: string };
  assert.equal(body.error, "Invalid JSON");
  assert.equal(body.code, "INVALID_JSON");
});

test("PATCH: 対象なしは404", async () => {
  const { deps } = buildDeps({ completions: [] });

  const response = await handleCancelTaskCompletion(
    new Request("http://localhost/api/task-completions/missing", {
      method: "PATCH",
      body: JSON.stringify({ cancelReason: "重複" }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "missing" }) },
    deps
  );

  assert.equal(response.status, 404);
  const body = (await readJson(response)) as { error?: string; code?: string };
  assert.equal(body.error, "Task completion not found.");
  assert.equal(body.code, "TASK_COMPLETION_NOT_FOUND");
});

test("PATCH: 既に取消済みは409", async () => {
  const completions: TaskCompletionRecord[] = [
    {
      id: "c1",
      houseId: "house-id-001",
      taskId: "t1",
      taskName: "A",
      points: 10,
      completedBy: "あなた",
      completedAt: "2026-03-01T00:00:00.000Z",
      source: "app",
      canceledAt: "2026-03-01T01:00:00.000Z",
      canceledBy: "あなた",
      cancelReason: "重複",
    },
  ];

  const { deps } = buildDeps({ completions });

  const response = await handleCancelTaskCompletion(
    new Request("http://localhost/api/task-completions/c1", {
      method: "PATCH",
      body: JSON.stringify({ cancelReason: "重複" }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "c1" }) },
    deps
  );

  assert.equal(response.status, 409);
  const body = (await readJson(response)) as { error?: string; code?: string };
  assert.equal(body.error, "Task completion is already canceled.");
  assert.equal(body.code, "TASK_COMPLETION_ALREADY_CANCELED");
});

test("PATCH: 正常系で取消と監査ログを作成", async () => {
  const completions: TaskCompletionRecord[] = [
    {
      id: "c1",
      houseId: "house-id-001",
      taskId: "t1",
      taskName: "A",
      points: 10,
      completedBy: "あなた",
      completedAt: "2026-03-01T00:00:00.000Z",
      source: "app",
    },
  ];

  const { deps, auditLogs, canceledCalls } = buildDeps({ completions });

  const response = await handleCancelTaskCompletion(
    new Request("http://localhost/api/task-completions/c1", {
      method: "PATCH",
      body: JSON.stringify({ cancelReason: "記録ミス" }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "c1" }) },
    deps
  );

  assert.equal(response.status, 200);
  assert.equal(canceledCalls.length, 1);
  assert.deepEqual(canceledCalls[0], {
    id: "c1",
    canceledBy: "あなた",
    cancelReason: "記録ミス",
    canceledAt: "2026-03-02T00:00:00.000Z",
  });

  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0]?.action, "task_completion_canceled");
  assert.equal(auditLogs[0]?.details.completionId, "c1");
});
