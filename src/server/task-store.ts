import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  FirestoreTaskDoc,
} from "../types/index.ts";
import { TASK_CATEGORIES } from "../shared/constants/task.ts";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "./store-utils.ts";
import { getAdminFirestore } from "../lib/firebase-admin.ts";

const COLLECTION = "tasks";
const CATEGORY_INDEX = new Map(TASK_CATEGORIES.map((category, index) => [category, index]));

function compareTaskOrder(a: Task, b: Task): number {
  const categoryDiff = (CATEGORY_INDEX.get(a.category) ?? 999) - (CATEGORY_INDEX.get(b.category) ?? 999);
  if (categoryDiff !== 0) {
    return categoryDiff;
  }

  const orderDiff = (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER);
  if (orderDiff !== 0) {
    return orderDiff;
  }

  return a.name.localeCompare(b.name, "ja");
}

function docToTask(id: string, data: FirestoreTaskDoc): Task {
  return {
    id,
    houseId: data.houseId,
    name: data.name,
    category: data.category,
    points: data.points,
    frequencyDays: data.frequencyDays,
    displayOrder: typeof data.displayOrder === "number" ? data.displayOrder : undefined,
    deletedAt: data.deletedAt ?? undefined,
  };
}

export async function listTasks(
  houseId: string,
  db?: FirebaseFirestore.Firestore
): Promise<Task[]> {
  const tasks = await readCollection({
    db,
    collection: COLLECTION,
    whereEquals: [
      { field: "houseId", value: houseId },
      { field: "deletedAt", value: null },
    ],
    mapDoc: docToTask,
  });
  return tasks.sort(compareTaskOrder);
}

export async function createTask(
  input: CreateTaskInput,
  db?: FirebaseFirestore.Firestore
): Promise<Task> {
  const data: FirestoreTaskDoc = {
    ...input,
    displayOrder: typeof input.displayOrder === "number" ? input.displayOrder : 0,
    deletedAt: null,
  };
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
  const updates: Partial<FirestoreTaskDoc> = {
    name: input.name,
    category: input.category,
    points: input.points,
    frequencyDays: input.frequencyDays,
  };
  if (typeof input.displayOrder === "number") {
    updates.displayOrder = input.displayOrder;
  }

  return updateCollectionDocConditionally({
    db,
    collection: COLLECTION,
    id: taskId,
    shouldUpdate: (data) => !data.deletedAt,
    updates,
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
