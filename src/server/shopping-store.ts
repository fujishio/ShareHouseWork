import type {
  ShoppingItem,
  CreateShoppingItemInput,
  CheckShoppingItemInput,
  FirestoreShoppingItemDoc,
} from "@/types";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "@/server/store-utils";

const COLLECTION = "shoppingItems";

function docToItem(id: string, data: FirestoreShoppingItemDoc): ShoppingItem {
  return {
    id,
    houseId: data.houseId,
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

export async function listShoppingItems(houseId: string): Promise<ShoppingItem[]> {
  return readCollection({
    collection: COLLECTION,
    whereEquals: [{ field: "houseId", value: houseId }],
    orderBy: { field: "addedAt", direction: "desc" },
    mapDoc: docToItem,
  });
}

export async function createShoppingItem(input: CreateShoppingItemInput): Promise<ShoppingItem> {
  const data: FirestoreShoppingItemDoc = {
    ...input,
    category: input.category ?? null,
    checkedBy: null,
    checkedAt: null,
    canceledAt: null,
    canceledBy: null,
  };
  return addCollectionDoc({ collection: COLLECTION, data, mapDoc: docToItem });
}

export async function updateShoppingItemChecked(
  itemId: string,
  input: CheckShoppingItemInput,
  checkedAt: string
): Promise<ShoppingItem | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: itemId,
    shouldUpdate: (data) => !data.checkedAt && !data.canceledAt,
    updates: { checkedBy: input.checkedBy, checkedAt },
    onGuardFail: "return-existing",
    mapDoc: docToItem,
  });
}

export async function updateShoppingItemUnchecked(itemId: string): Promise<ShoppingItem | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: itemId,
    shouldUpdate: () => true,
    updates: { checkedBy: null, checkedAt: null },
    onGuardFail: "return-null",
    mapDoc: docToItem,
  });
}

export async function updateShoppingItemCanceled(
  itemId: string,
  canceledBy: string,
  canceledAt: string
): Promise<ShoppingItem | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: itemId,
    shouldUpdate: (data) => !data.canceledAt,
    updates: { canceledAt, canceledBy },
    onGuardFail: "return-existing",
    mapDoc: docToItem,
  });
}

export const readShoppingItems = listShoppingItems;
export const appendShoppingItem = createShoppingItem;
export const checkShoppingItem = updateShoppingItemChecked;
export const uncheckShoppingItem = updateShoppingItemUnchecked;
export const cancelShoppingItem = updateShoppingItemCanceled;
