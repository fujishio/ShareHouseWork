import type { Task, CreateTaskInput, UpdateTaskInput, FirestoreTaskDoc } from "@/types";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "@/server/store-utils";
import { getAdminFirestore } from "@/lib/firebase-admin";

const COLLECTION = "tasks";

function docToTask(id: string, data: FirestoreTaskDoc): Task {
  return {
    id,
    houseId: data.houseId,
    name: data.name,
    category: data.category,
    points: data.points,
    frequencyDays: data.frequencyDays,
    deletedAt: data.deletedAt ?? undefined,
  };
}

export async function listTasks(houseId: string): Promise<Task[]> {
  return readCollection({
    collection: COLLECTION,
    whereEquals: [
      { field: "houseId", value: houseId },
      { field: "deletedAt", value: null },
    ],
    mapDoc: docToTask,
  });
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const data: FirestoreTaskDoc = { ...input, deletedAt: null };
  return addCollectionDoc({ collection: COLLECTION, data, mapDoc: docToTask });
}

export async function readTaskById(taskId: string): Promise<Task | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(COLLECTION).doc(taskId).get();
  if (!doc.exists) return null;
  return docToTask(doc.id, doc.data() as FirestoreTaskDoc);
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: taskId,
    shouldUpdate: (data) => !data.deletedAt,
    updates: { ...input },
    onGuardFail: "return-null",
    mapDoc: docToTask,
  });
}

export async function updateTaskDeletion(taskId: string, deletedAt: string): Promise<Task | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: taskId,
    shouldUpdate: (data) => !data.deletedAt,
    updates: { deletedAt },
    onGuardFail: "return-existing",
    mapDoc: docToTask,
  });
}

export const readTasks = listTasks;
export const readTask = readTaskById;
export const deleteTask = updateTaskDeletion;
