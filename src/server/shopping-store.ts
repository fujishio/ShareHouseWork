import { getAdminFirestore } from "@/lib/firebase-admin";
import type { ShoppingItem, CreateShoppingItemInput, CheckShoppingItemInput } from "@/types";

const COLLECTION = "shoppingItems";

function docToItem(id: string, data: FirebaseFirestore.DocumentData): ShoppingItem {
  return {
    id,
    name: data.name,
    quantity: data.quantity,
    memo: data.memo,
    category: data.category ?? undefined,
    addedBy: data.addedBy,
    addedAt: data.addedAt,
    checkedBy: data.checkedBy ?? undefined,
    checkedAt: data.checkedAt ?? undefined,
    canceledAt: data.canceledAt ?? undefined,
    canceledBy: data.canceledBy ?? undefined,
  };
}

export async function readShoppingItems(): Promise<ShoppingItem[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("addedAt", "desc")
    .get();
  return snapshot.docs.map((doc) => docToItem(doc.id, doc.data()));
}

export async function appendShoppingItem(input: CreateShoppingItemInput): Promise<ShoppingItem> {
  const db = getAdminFirestore();
  const data = {
    ...input,
    category: input.category ?? null,
    checkedBy: null,
    checkedAt: null,
    canceledAt: null,
    canceledBy: null,
  };
  const ref = await db.collection(COLLECTION).add(data);
  return docToItem(ref.id, data);
}

export async function checkShoppingItem(
  itemId: string,
  input: CheckShoppingItemInput,
  checkedAt: string
): Promise<ShoppingItem | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(itemId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.checkedAt || data.canceledAt) return docToItem(itemId, data);

  const updated = { checkedBy: input.checkedBy, checkedAt };
  await ref.update(updated);
  return docToItem(itemId, { ...data, ...updated });
}

export async function uncheckShoppingItem(itemId: string): Promise<ShoppingItem | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(itemId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  await ref.update({ checkedBy: null, checkedAt: null });
  return docToItem(itemId, { ...doc.data(), checkedBy: null, checkedAt: null });
}

export async function cancelShoppingItem(
  itemId: string,
  canceledBy: string,
  canceledAt: string
): Promise<ShoppingItem | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(itemId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.canceledAt) return docToItem(itemId, data);

  const updated = { canceledAt, canceledBy };
  await ref.update(updated);
  return docToItem(itemId, { ...data, ...updated });
}
