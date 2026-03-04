import { handleCreateTask, handleGetTasks } from "@/server/api/tasks-api";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import { createTask, readTasks } from "@/server/task-store";

export const runtime = "nodejs";

const getDeps = {
  readTasks,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

const createDeps = {
  createTask,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

export async function GET(request: Request) {
  return handleGetTasks(request, getDeps);
}

export async function POST(request: Request) {
  return handleCreateTask(request, createDeps);
}
