import { getAdminFirestore } from "../lib/firebase-admin.ts";

const COLLECTION = "task_pending_states";

type TaskPendingDoc = {
  houseId: string;
  pendingTaskIds: string[];
  updatedAt: string;
};

export type TaskPendingState = {
  houseId: string;
  pendingTaskIds: string[];
  updatedAt: string;
};

function sanitizePendingTaskIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const onlyStrings = values.filter((value): value is string => typeof value === "string");
  return Array.from(new Set(onlyStrings));
}

function toState(doc: TaskPendingDoc): TaskPendingState {
  return {
    houseId: doc.houseId,
    pendingTaskIds: sanitizePendingTaskIds(doc.pendingTaskIds),
    updatedAt: doc.updatedAt,
  };
}

export async function readTaskPendingState(houseId: string): Promise<TaskPendingState> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(houseId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return {
      houseId,
      pendingTaskIds: [],
      updatedAt: "",
    };
  }
  const data = snapshot.data() as Partial<TaskPendingDoc>;
  return toState({
    houseId,
    pendingTaskIds: sanitizePendingTaskIds(data.pendingTaskIds),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
  });
}

export async function saveTaskPendingState(
  houseId: string,
  pendingTaskIds: string[],
  nowIso: string
): Promise<TaskPendingState> {
  const db = getAdminFirestore();
  const deduped = Array.from(new Set(pendingTaskIds.filter((id) => typeof id === "string")));
  const payload: TaskPendingDoc = {
    houseId,
    pendingTaskIds: deduped,
    updatedAt: nowIso,
  };
  await db.collection(COLLECTION).doc(houseId).set(payload, { merge: true });
  return payload;
}
