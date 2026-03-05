import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHouseExitPatch,
  buildStringFieldAnonymizePatch,
  getHouseScopedCollections,
  partitionHostedHouses,
  replaceNameInStringArray,
  type AccountDeletionHouseRecord,
} from "./account-deletion-logic.ts";

test("partitionHostedHouses: ホスト所属と一般所属を分割", () => {
  const houses: AccountDeletionHouseRecord[] = [
    {
      id: "h1",
      ownerUid: "u1",
      memberUids: ["u1", "u2"],
      hostUids: ["u1", "u2"],
    },
    {
      id: "h2",
      ownerUid: "u3",
      memberUids: ["u1", "u3"],
      hostUids: ["u3"],
    },
  ];
  const split = partitionHostedHouses("u1", houses);
  assert.deepEqual(split.hosted.map((house) => house.id), ["h1"]);
  assert.deepEqual(split.memberOnly.map((house) => house.id), ["h2"]);
});

test("getHouseScopedCollections: 削除対象コレクションを返す", () => {
  const collections = getHouseScopedCollections();
  assert.ok(collections.includes("tasks"));
  assert.ok(collections.includes("expenses"));
  assert.ok(collections.includes("balanceAdjustments"));
  assert.ok(collections.includes("contributionSettings"));
  assert.ok(collections.includes("task_pending_states"));
});

test("buildHouseExitPatch: member/host から UID を除去し owner を移譲", () => {
  const patch = buildHouseExitPatch("u1", {
    id: "h1",
    ownerUid: "u1",
    memberUids: ["u1", "u2", "u3"],
    hostUids: ["u1", "u2"],
  });

  assert.deepEqual(patch, {
    memberUids: ["u2", "u3"],
    hostUids: ["u2"],
    ownerUid: "u2",
  });
});

test("buildStringFieldAnonymizePatch: 対象フィールドのみ匿名化", () => {
  const patch = buildStringFieldAnonymizePatch(
    {
      completedBy: "家主",
      canceledBy: "別ユーザー",
      actor: "家主",
    },
    ["completedBy", "canceledBy"],
    "家主",
    "退会済みユーザー"
  );

  assert.deepEqual(patch, {
    completedBy: "退会済みユーザー",
  });
});

test("replaceNameInStringArray: 対象名を配列内で置換", () => {
  const result = replaceNameInStringArray(
    ["家主", "パートナー"],
    "家主",
    "退会済みユーザー"
  );
  assert.deepEqual(result, ["退会済みユーザー", "パートナー"]);
});

test("replaceNameInStringArray: 対象が無い場合 null", () => {
  const result = replaceNameInStringArray(
    ["パートナー", "友達1"],
    "家主",
    "退会済みユーザー"
  );
  assert.equal(result, null);
});
