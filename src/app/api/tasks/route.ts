import { handleCreateTask, handleGetTasks } from "@/server/api/tasks-api";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { createTask, readTasks } from "@/server/task-store";

export const runtime = "nodejs";

const getDeps = {
  readTasks,
  verifyRequest,
  unauthorizedResponse,
};

const createDeps = {
  createTask,
  verifyRequest,
  unauthorizedResponse,
};

export async function GET(request: Request) {
  return handleGetTasks(request, getDeps);
}

export async function POST(request: Request) {
  return handleCreateTask(request, createDeps);
}
