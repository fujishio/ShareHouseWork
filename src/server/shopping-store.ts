import type { ShoppingItem, CreateShoppingItemInput, CheckShoppingItemInput } from "@/types";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "@/server/store-utils";

const COLLECTION = "shoppingItems";

function docToItem(id: string, data: FirebaseFirestore.DocumentData): ShoppingItem {
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

export async function readShoppingItems(houseId: string): Promise<ShoppingItem[]> {
  return readCollection({
    collection: COLLECTION,
    whereEquals: [{ field: "houseId", value: houseId }],
    orderBy: { field: "addedAt", direction: "desc" },
    mapDoc: docToItem,
  });
}

export async function appendShoppingItem(input: CreateShoppingItemInput): Promise<ShoppingItem> {
  const data = {
    ...input,
    category: input.category ?? null,
    checkedBy: null,
    checkedAt: null,
    canceledAt: null,
    canceledBy: null,
  };
  return addCollectionDoc({ collection: COLLECTION, data, mapDoc: docToItem });
}

export async function checkShoppingItem(
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

export async function uncheckShoppingItem(itemId: string): Promise<ShoppingItem | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: itemId,
    shouldUpdate: () => true,
    updates: { checkedBy: null, checkedAt: null },
    onGuardFail: "return-null",
    mapDoc: docToItem,
  });
}

export async function cancelShoppingItem(
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
