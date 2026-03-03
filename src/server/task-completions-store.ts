import type { TaskCompletionRecord } from "@/types";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "@/server/store-utils";

const COLLECTION = "taskCompletions";

function docToRecord(id: string, data: FirebaseFirestore.DocumentData): TaskCompletionRecord {
  return {
    id,
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

export async function readTaskCompletions(): Promise<TaskCompletionRecord[]> {
  return readCollection({
    collection: COLLECTION,
    orderBy: { field: "completedAt", direction: "desc" },
    mapDoc: docToRecord,
  });
}

export async function appendTaskCompletion(
  record: Omit<TaskCompletionRecord, "id">
): Promise<TaskCompletionRecord> {
  const data = {
    ...record,
    canceledAt: record.canceledAt ?? null,
    canceledBy: record.canceledBy ?? null,
    cancelReason: record.cancelReason ?? null,
  };
  return addCollectionDoc({ collection: COLLECTION, data, mapDoc: docToRecord });
}

export async function cancelTaskCompletion(
  completionId: string,
  canceledBy: string,
  cancelReason: string,
  canceledAt: string
): Promise<TaskCompletionRecord | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: completionId,
    shouldUpdate: (data) => !data.canceledAt,
    updates: { canceledAt, canceledBy, cancelReason },
    onGuardFail: "return-existing",
    mapDoc: docToRecord,
  });
}
