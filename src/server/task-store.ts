import { getAdminFirestore } from "@/lib/firebase-admin";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/types";

const COLLECTION = "tasks";

function docToTask(id: string, data: FirebaseFirestore.DocumentData): Task {
  return {
    id,
    name: data.name,
    category: data.category,
    points: data.points,
    frequencyDays: data.frequencyDays,
    deletedAt: data.deletedAt ?? undefined,
  };
}

export async function readTasks(): Promise<Task[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .where("deletedAt", "==", null)
    .get();
  return snapshot.docs.map((doc) => docToTask(doc.id, doc.data()));
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = getAdminFirestore();
  const data = { ...input, deletedAt: null };
  const ref = await db.collection(COLLECTION).add(data);
  return docToTask(ref.id, data);
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(taskId);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.deletedAt) return null;

  await ref.update({ ...input });
  return docToTask(taskId, { ...doc.data(), ...input });
}

export async function deleteTask(taskId: string, deletedAt: string): Promise<Task | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(taskId);
  const doc = await ref.get();
  if (!doc.exists) return null;
  if (doc.data()?.deletedAt) return docToTask(taskId, doc.data()!);

  await ref.update({ deletedAt });
  return docToTask(taskId, { ...doc.data(), deletedAt });
}
