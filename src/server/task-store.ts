import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  FirestoreTaskDoc,
} from "../types/index.ts";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "./store-utils.ts";
import { getAdminFirestore } from "../lib/firebase-admin.ts";

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

export async function listTasks(
  houseId: string,
  db?: FirebaseFirestore.Firestore
): Promise<Task[]> {
  return readCollection({
    db,
    collection: COLLECTION,
    whereEquals: [
      { field: "houseId", value: houseId },
      { field: "deletedAt", value: null },
    ],
    mapDoc: docToTask,
  });
}

export async function createTask(
  input: CreateTaskInput,
  db?: FirebaseFirestore.Firestore
): Promise<Task> {
  const data: FirestoreTaskDoc = { ...input, deletedAt: null };
  return addCollectionDoc({ db, collection: COLLECTION, data, mapDoc: docToTask });
}

export async function readTaskById(
  taskId: string,
  db?: FirebaseFirestore.Firestore
): Promise<Task | null> {
  const firestore = db ?? getAdminFirestore();
  const doc = await firestore.collection(COLLECTION).doc(taskId).get();
  if (!doc.exists) return null;
  return docToTask(doc.id, doc.data() as FirestoreTaskDoc);
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
  db?: FirebaseFirestore.Firestore
): Promise<Task | null> {
  return updateCollectionDocConditionally({
    db,
    collection: COLLECTION,
    id: taskId,
    shouldUpdate: (data) => !data.deletedAt,
    updates: { ...input },
    onGuardFail: "return-null",
    mapDoc: docToTask,
  });
}

export async function updateTaskDeletion(
  taskId: string,
  deletedAt: string,
  db?: FirebaseFirestore.Firestore
): Promise<Task | null> {
  return updateCollectionDocConditionally({
    db,
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
