import { handleDeleteTask, handleUpdateTask } from "@/server/api/tasks-api";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { deleteTask, updateTask } from "@/server/task-store";

export const runtime = "nodejs";

const updateDeps = {
  updateTask,
  verifyRequest,
  unauthorizedResponse,
};

const deleteDeps = {
  deleteTask,
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
