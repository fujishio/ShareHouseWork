import test from "node:test";
import assert from "node:assert/strict";
import {
  listContributionSettingsHistory,
  readCurrentContributionSettings,
  resolveContributionSettingsAtMonth,
  updateContributionMemberCountForCurrentMonth,
  updateContributionSettingsForCurrentMonth,
} from "./contribution-settings-store.ts";
import { createFakeFirestoreDb } from "./test-helpers/fake-firestore-db.ts";

test("resolveContributionSettingsAtMonth: 不正月はデフォルト、有効月は履歴から解決", () => {
  const history = [
    { houseId: "h1", effectiveMonth: "2026-01", monthlyAmountPerPerson: 15000, memberCount: 2 },
    { houseId: "h1", effectiveMonth: "2026-03", monthlyAmountPerPerson: 18000, memberCount: 3 },
  ];

  assert.deepEqual(resolveContributionSettingsAtMonth(history, "2026/03"), {
    monthlyAmountPerPerson: 15000,
    memberCount: 1,
  });
  assert.deepEqual(resolveContributionSettingsAtMonth(history, "2026-02"), {
    monthlyAmountPerPerson: 15000,
    memberCount: 2,
  });
  assert.deepEqual(resolveContributionSettingsAtMonth(history, "2026-03"), {
    monthlyAmountPerPerson: 18000,
    memberCount: 3,
  });
});

test("listContributionSettingsHistory: 初回は seed を作成して返す", async () => {
  const fake = createFakeFirestoreDb({ contributionSettings: {} });

  const rows = await listContributionSettingsHistory("h1", {
    db: fake.db,
    getHouseById: async () => ({
      id: "h1",
      name: "A",
      memberUids: ["u1", "u2"],
      hostUids: ["u1"],
      createdAt: "2026-03-01T00:00:00.000Z",
    }),
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.effectiveMonth, "2000-01");
  assert.equal(rows[0]?.memberCount, 2);
});

test("updateContributionSettingsForCurrentMonth: 指定月で保存", async () => {
  const fake = createFakeFirestoreDb({ contributionSettings: {} });

  await updateContributionSettingsForCurrentMonth(
    "h1",
    { monthlyAmountPerPerson: 20000, memberCount: 3 },
    { db: fake.db, monthKey: "2026-03" }
  );

  assert.equal(fake.seed.contributionSettings?.["h1_2026-03"]?.monthlyAmountPerPerson, 20000);
  assert.equal(fake.seed.contributionSettings?.["h1_2026-03"]?.memberCount, 3);
});

test("readCurrentContributionSettings: monthKey に対する現在設定を返す", async () => {
  const fake = createFakeFirestoreDb({
    contributionSettings: {
      "h1_2026-01": {
        houseId: "h1",
        effectiveMonth: "2026-01",
        monthlyAmountPerPerson: 15000,
        memberCount: 2,
      },
      "h1_2026-03": {
        houseId: "h1",
        effectiveMonth: "2026-03",
        monthlyAmountPerPerson: 18000,
        memberCount: 3,
      },
    },
  });

  const current = await readCurrentContributionSettings("h1", {
    db: fake.db,
    monthKey: "2026-03",
    getHouseById: async () => null,
  });

  assert.deepEqual(current, { monthlyAmountPerPerson: 18000, memberCount: 3 });
});

test("updateContributionMemberCountForCurrentMonth: 既存同値なら更新しない、未作成なら作成", async () => {
  const fake = createFakeFirestoreDb({
    contributionSettings: {
      "h1_2026-03": {
        houseId: "h1",
        effectiveMonth: "2026-03",
        monthlyAmountPerPerson: 18000,
        memberCount: 3,
      },
    },
  });

  await updateContributionMemberCountForCurrentMonth("h1", 3, {
    db: fake.db,
    monthKey: "2026-03",
    getHouseById: async () => null,
  });
  assert.equal(fake.calls.set.length, 0);

  await updateContributionMemberCountForCurrentMonth("h1", 4, {
    db: fake.db,
    monthKey: "2026-03",
    getHouseById: async () => null,
  });
  assert.equal(fake.seed.contributionSettings?.["h1_2026-03"]?.memberCount, 4);

  const empty = createFakeFirestoreDb({ contributionSettings: {} });
  await updateContributionMemberCountForCurrentMonth("h2", 2, {
    db: empty.db,
    monthKey: "2026-04",
    getHouseById: async () => null,
  });
  assert.equal(empty.seed.contributionSettings?.["h2_2026-04"]?.memberCount, 2);
});
