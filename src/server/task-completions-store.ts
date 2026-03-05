import type { TaskCompletionRecord, FirestoreTaskCompletionDoc } from "../types/index.ts";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "./store-utils.ts";

const COLLECTION = "taskCompletions";

function docToRecord(id: string, data: FirestoreTaskCompletionDoc): TaskCompletionRecord {
  return {
    id,
    houseId: data.houseId,
    taskId: data.taskId,
    taskName: data.taskName,
    points: data.points,
    completedBy: data.completedBy,
    completedAt: data.completedAt,
    source: data.source,
    canceledAt: data.canceledAt ?? undefined,
    canceledBy: data.canceledBy ?? undefined,
    cancelReason: data.cancelReason ?? undefined,
  };
}

export async function listTaskCompletions(
  houseId: string,
  db?: FirebaseFirestore.Firestore
): Promise<TaskCompletionRecord[]> {
  return readCollection({
    db,
    collection: COLLECTION,
    whereEquals: [{ field: "houseId", value: houseId }],
    orderBy: { field: "completedAt", direction: "desc" },
    mapDoc: docToRecord,
  });
}

export async function createTaskCompletion(
  record: Omit<TaskCompletionRecord, "id">,
  db?: FirebaseFirestore.Firestore
): Promise<TaskCompletionRecord> {
  const data: FirestoreTaskCompletionDoc = {
    ...record,
    canceledAt: record.canceledAt ?? null,
    canceledBy: record.canceledBy ?? null,
    cancelReason: record.cancelReason ?? null,
  };
  return addCollectionDoc({ db, collection: COLLECTION, data, mapDoc: docToRecord });
}

export async function updateTaskCompletionCancellation(
  completionId: string,
  canceledBy: string,
  cancelReason: string,
  canceledAt: string,
  db?: FirebaseFirestore.Firestore
): Promise<TaskCompletionRecord | null> {
  return updateCollectionDocConditionally({
    db,
    collection: COLLECTION,
    id: completionId,
    shouldUpdate: (data) => !data.canceledAt,
    updates: { canceledAt, canceledBy, cancelReason },
    onGuardFail: "return-existing",
    mapDoc: docToRecord,
  });
}

export const readTaskCompletions = listTaskCompletions;
export const appendTaskCompletion = createTaskCompletion;
export const cancelTaskCompletion = updateTaskCompletionCancellation;
