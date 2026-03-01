import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { nextId } from "@/server/store-utils";
import type { ShoppingItem, CreateShoppingItemInput, CheckShoppingItemInput } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "shopping.json");

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, "[]\n", "utf-8");
  }
}

export async function readShoppingItems(): Promise<ShoppingItem[]> {
  await ensureDataFile();

  const raw = await readFile(DATA_FILE, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed as ShoppingItem[];
}

export async function writeShoppingItems(items: ShoppingItem[]) {
  await ensureDataFile();
  await writeFile(DATA_FILE, `${JSON.stringify(items, null, 2)}\n`, "utf-8");
}

export async function appendShoppingItem(
  input: CreateShoppingItemInput
): Promise<ShoppingItem> {
  const items = await readShoppingItems();
  const created: ShoppingItem = {
    id: nextId(items),
    ...input,
  };

  await writeShoppingItems([...items, created]);
  return created;
}

export async function checkShoppingItem(
  itemId: number,
  input: CheckShoppingItemInput,
  checkedAt: string
): Promise<ShoppingItem | null> {
  const items = await readShoppingItems();
  const index = items.findIndex((item) => item.id === itemId);

  if (index === -1) {
    return null;
  }

  const target = items[index];
  if (target.checkedAt || target.canceledAt) {
    return target;
  }

  const updated: ShoppingItem = {
    ...target,
    checkedBy: input.checkedBy,
    checkedAt,
  };

  items[index] = updated;
  await writeShoppingItems(items);
  return updated;
}

export async function uncheckShoppingItem(
  itemId: number
): Promise<ShoppingItem | null> {
  const items = await readShoppingItems();
  const index = items.findIndex((item) => item.id === itemId);

  if (index === -1) {
    return null;
  }

  const target = items[index];
  const updated: ShoppingItem = {
    ...target,
    checkedBy: undefined,
    checkedAt: undefined,
  };

  items[index] = updated;
  await writeShoppingItems(items);
  return updated;
}

export async function cancelShoppingItem(
  itemId: number,
  canceledBy: string,
  canceledAt: string
): Promise<ShoppingItem | null> {
  const items = await readShoppingItems();
  const index = items.findIndex((item) => item.id === itemId);

  if (index === -1) {
    return null;
  }

  const target = items[index];
  if (target.canceledAt) {
    return target;
  }

  const updated: ShoppingItem = {
    ...target,
    canceledAt,
    canceledBy,
  };

  items[index] = updated;
  await writeShoppingItems(items);
  return updated;
}
