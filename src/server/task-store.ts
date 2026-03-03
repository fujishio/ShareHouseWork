import type { Task, CreateTaskInput, UpdateTaskInput } from "@/types";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "@/server/store-utils";

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
  return readCollection({
    collection: COLLECTION,
    whereEquals: [{ field: "deletedAt", value: null }],
    mapDoc: docToTask,
  });
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const data = { ...input, deletedAt: null };
  return addCollectionDoc({ collection: COLLECTION, data, mapDoc: docToTask });
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

export async function deleteTask(taskId: string, deletedAt: string): Promise<Task | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: taskId,
    shouldUpdate: (data) => !data.deletedAt,
    updates: { deletedAt },
    onGuardFail: "return-existing",
    mapDoc: docToTask,
  });
}
