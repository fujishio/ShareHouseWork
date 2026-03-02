import { getAdminFirestore } from "@/lib/firebase-admin";
import type { TaskCompletionRecord } from "@/types";

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
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("completedAt", "desc")
    .get();
  return snapshot.docs.map((doc) => docToRecord(doc.id, doc.data()));
}

export async function appendTaskCompletion(
  record: Omit<TaskCompletionRecord, "id">
): Promise<TaskCompletionRecord> {
  const db = getAdminFirestore();
  const data = {
    ...record,
    canceledAt: record.canceledAt ?? null,
    canceledBy: record.canceledBy ?? null,
    cancelReason: record.cancelReason ?? null,
  };
  const ref = await db.collection(COLLECTION).add(data);
  return docToRecord(ref.id, data);
}

export async function cancelTaskCompletion(
  completionId: string,
  canceledBy: string,
  cancelReason: string,
  canceledAt: string
): Promise<TaskCompletionRecord | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(completionId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.canceledAt) return docToRecord(completionId, data);

  const updated = { canceledAt, canceledBy, cancelReason };
  await ref.update(updated);
  return docToRecord(completionId, { ...data, ...updated });
}
