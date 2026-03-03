import test from "node:test";
import assert from "node:assert/strict";
import {
  handleCreateTask,
  handleDeleteTask,
  handleGetTasks,
  handleUpdateTask,
} from "./tasks-api.ts";
import type { Task } from "../../types/index.ts";

type Actor = { uid: string; name: string; email: string };
const defaultActor: Actor = { uid: "u1", name: "あなた", email: "you@example.com" };

function buildDeps(options?: { actor?: Actor | null; tasks?: Task[] }) {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  const tasks = options?.tasks ?? [];

  const verifyRequest = async () => {
    if (!actor) throw new Error("unauthorized");
    return actor;
  };

  return {
    getDeps: {
      readTasks: async () => tasks,
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    },
    createDeps: {
      createTask: async (input: Omit<Task, "id" | "deletedAt">) => ({
        id: "t-new",
        ...input,
      }),
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    },
    updateDeps: {
      updateTask: async (id: string) => {
        const task = tasks.find((item) => item.id === id);
        return task ? { ...task, name: "更新後タスク" } : null;
      },
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
    },
    deleteDeps: {
      deleteTask: async (id: string, deletedAt: string) => {
        const task = tasks.find((item) => item.id === id);
        return task ? { ...task, deletedAt } : null;
      },
      verifyRequest,
      unauthorizedResponse: () => Response.json({ error: "Unauthorized" }, { status: 401 }),
      now: () => "2026-03-02T00:00:00.000Z",
    },
  };
}

test("GET tasks: 未認証は401", async () => {
  const { getDeps } = buildDeps({ actor: null });
  const response = await handleGetTasks(new Request("http://localhost/api/tasks"), getDeps);
  assert.equal(response.status, 401);
});

test("POST tasks: category不正は400", async () => {
  const { createDeps } = buildDeps();
  const response = await handleCreateTask(
    new Request("http://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        name: "掃除",
        category: "invalid",
        points: 2,
        frequencyDays: 7,
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

test("PATCH tasks: not foundは404", async () => {
  const { updateDeps } = buildDeps({ tasks: [] });
  const response = await handleUpdateTask(
    new Request("http://localhost/api/tasks/t1", {
      method: "PATCH",
      body: JSON.stringify({
        name: "掃除",
        category: "共用部の掃除",
        points: 2,
        frequencyDays: 7,
      }),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "t1" }) },
    updateDeps
  );

  assert.equal(response.status, 404);
});

test("DELETE tasks: 正常系", async () => {
  const tasks: Task[] = [
    {
      id: "t1",
      name: "掃除",
      category: "共用部の掃除",
      points: 2,
      frequencyDays: 7,
    },
  ];
  const { deleteDeps } = buildDeps({ tasks });

  const response = await handleDeleteTask(
    new Request("http://localhost/api/tasks/t1", { method: "DELETE" }),
    { params: Promise.resolve({ id: "t1" }) },
    deleteDeps
  );

  assert.equal(response.status, 200);
  const body = (await response.json()) as { data: Task };
  assert.equal(body.data.id, "t1");
});
