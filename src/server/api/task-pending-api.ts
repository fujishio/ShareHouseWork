import { z } from "zod";
import {
  readJsonBody,
  resolveHouseScopedContext,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";
import type { TaskPendingState } from "../task-pending-store.ts";

const putTaskPendingSchema = z.object({
  pendingTaskIds: z.array(z.string().min(1)).max(1000),
});

export type GetTaskPendingDeps = {
  readTaskPendingState: (houseId: string) => Promise<TaskPendingState>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type PutTaskPendingDeps = {
  saveTaskPendingState: (
    houseId: string,
    pendingTaskIds: string[],
    nowIso: string
  ) => Promise<TaskPendingState>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export async function handleGetTaskPending(request: Request, deps: GetTaskPendingDeps) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;
  const state = await deps.readTaskPendingState(context.houseId);
  return Response.json({ data: state });
}

export async function handlePutTaskPending(request: Request, deps: PutTaskPendingDeps) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = putTaskPendingSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return validationError("Invalid body", parsed.error.issues);
  }

  const pendingTaskIds = Array.from(new Set(parsed.data.pendingTaskIds));
  const saved = await deps.saveTaskPendingState(context.houseId, pendingTaskIds, deps.now());
  return Response.json({ data: saved });
}
