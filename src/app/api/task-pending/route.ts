import {
  handleGetTaskPending,
  handlePutTaskPending,
} from "@/server/api/task-pending-api";
import { resolveActorHouseId, unauthorizedResponse, verifyRequest } from "@/server/auth";
import { readTaskPendingState, saveTaskPendingState } from "@/server/task-pending-store";

export const runtime = "nodejs";

const getDeps = {
  readTaskPendingState,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

const putDeps = {
  saveTaskPendingState,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function GET(request: Request) {
  return handleGetTaskPending(request, getDeps);
}

export async function PUT(request: Request) {
  return handlePutTaskPending(request, putDeps);
}
