import { handleDeleteTask, handleUpdateTask } from "@/server/api/tasks-api";
import { resolveActorHouseId, verifyRequest, unauthorizedResponse } from "@/server/auth";
import { deleteTask, readTask, updateTask } from "@/server/task-store";

export const runtime = "nodejs";

const updateDeps = {
  readTask,
  updateTask,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

const deleteDeps = {
  readTask,
  deleteTask,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateTask(request, context, updateDeps);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleDeleteTask(request, context, deleteDeps);
}
