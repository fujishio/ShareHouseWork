import test from "node:test";
import assert from "node:assert/strict";
import {
  createShoppingItem,
  listShoppingItems,
  updateShoppingItemCanceled,
  updateShoppingItemChecked,
  updateShoppingItemUnchecked,
} from "./shopping-store.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("listShoppingItems: houseId 条件と addedAt desc を設定", async () => {
  const fake = createFakeFirestoreDb({
    shoppingItems: {
      s1: {
        houseId: "h1",
        name: "洗剤",
        quantity: "1",
        memo: "",
        category: null,
        addedBy: "あなた",
        addedAt: "2026-03-01",
        checkedBy: null,
        checkedAt: null,
        canceledAt: null,
        canceledBy: null,
      },
    },
  });

  const items = await listShoppingItems("h1", fake.db);

  assert.equal(items.length, 1);
  assert.equal(fake.calls.orderBy[0]?.field, "addedAt");
});

test("createShoppingItem: 初期 checked/canceled を null で保存", async () => {
  const fake = createFakeFirestoreDb({ shoppingItems: {} });

  const created = await createShoppingItem(
    {
      houseId: "h1",
      name: "ティッシュ",
      quantity: "2",
      memo: "",
      category: undefined,
      addedBy: "あなた",
      addedAt: "2026-03-01",
    },
    fake.db
  );

  assert.equal(created.id, "new-1");
  assert.equal(fake.seed.shoppingItems?.["new-1"]?.checkedAt, null);
  assert.equal(fake.seed.shoppingItems?.["new-1"]?.canceledAt, null);
});

test("updateShoppingItemChecked: 未チェックのみ更新、済みは既存返却", async () => {
  const fake = createFakeFirestoreDb({
    shoppingItems: {
      s1: {
        houseId: "h1",
        name: "A",
        quantity: "1",
        memo: "",
        category: null,
        addedBy: "あなた",
        addedAt: "2026-03-01",
        checkedBy: null,
        checkedAt: null,
        canceledAt: null,
        canceledBy: null,
      },
      s2: {
        houseId: "h1",
        name: "B",
        quantity: "1",
        memo: "",
        category: null,
        addedBy: "あなた",
        addedAt: "2026-03-01",
        checkedBy: "あなた",
        checkedAt: "2026-03-01",
        canceledAt: null,
        canceledBy: null,
      },
    },
  });

  const checked = await updateShoppingItemChecked("s1", { checkedBy: "あなた" }, "2026-03-05", fake.db);
  const already = await updateShoppingItemChecked("s2", { checkedBy: "あなた" }, "2026-03-05", fake.db);

  assert.equal(checked?.checkedAt, "2026-03-05");
  assert.equal(already?.checkedAt, "2026-03-01");
});

test("updateShoppingItemUnchecked: checked を null に戻す", async () => {
  const fake = createFakeFirestoreDb({
    shoppingItems: {
      s1: {
        houseId: "h1",
        name: "A",
        quantity: "1",
        memo: "",
        category: null,
        addedBy: "あなた",
        addedAt: "2026-03-01",
        checkedBy: "あなた",
        checkedAt: "2026-03-01",
        canceledAt: null,
        canceledBy: null,
      },
    },
  });

  const unchecked = await updateShoppingItemUnchecked("s1", fake.db);
  assert.equal(unchecked?.checkedAt, undefined);
  assert.equal(unchecked?.checkedBy, undefined);
});

test("updateShoppingItemCanceled: 初回取消は更新、再取消は既存を返す", async () => {
  const fake = createFakeFirestoreDb({
    shoppingItems: {
      s1: {
        houseId: "h1",
        name: "A",
        quantity: "1",
        memo: "",
        category: null,
        addedBy: "あなた",
        addedAt: "2026-03-01",
        checkedBy: null,
        checkedAt: null,
        canceledAt: null,
        canceledBy: null,
      },
      s2: {
        houseId: "h1",
        name: "B",
        quantity: "1",
        memo: "",
        category: null,
        addedBy: "あなた",
        addedAt: "2026-03-01",
        checkedBy: null,
        checkedAt: null,
        canceledAt: "2026-03-01",
        canceledBy: "あなた",
      },
    },
  });

  const canceled = await updateShoppingItemCanceled("s1", "あなた", "2026-03-05", fake.db);
  const already = await updateShoppingItemCanceled("s2", "あなた", "2026-03-05", fake.db);

  assert.equal(canceled?.canceledAt, "2026-03-05");
  assert.equal(already?.canceledAt, "2026-03-01");
});
