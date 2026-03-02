import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { TASK_DEFINITIONS } from "../src/domain/tasks/task-definitions.ts";
import { toJstMonthKey } from "../src/shared/lib/time.ts";

type SeedTask = {
  name: string;
  category: string;
  points: number;
  frequencyDays: number;
  deletedAt: null;
};

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function ensureEnvLoaded() {
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  loadEnvFile(resolve(process.cwd(), ".env"));
}

function ensureEmulator() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Start emulator and set env (or add to .env.local).",
    );
  }
}

async function clearCollection(collectionName: string) {
  const db = getFirestore();
  const batchSize = 200;

  while (true) {
    const snapshot = await db.collection(collectionName).limit(batchSize).get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

function buildTaskSeeds(): SeedTask[] {
  return Object.entries(TASK_DEFINITIONS).flatMap(([category, defs]) =>
    defs.map((task) => ({
      name: task.name,
      category,
      points: task.points,
      frequencyDays: task.frequencyDays,
      deletedAt: null,
    })),
  );
}

async function seedUsers() {
  const db = getFirestore();
  const users = [
    { id: "u-owner", name: "家主", color: "#d97706", email: "owner@example.com" },
    { id: "u-partner", name: "パートナー", color: "#57534e", email: "partner@example.com" },
    { id: "u-friend1", name: "友達１", color: "#059669", email: "friend1@example.com" },
    { id: "u-friend2", name: "友達２", color: "#db2777", email: "friend2@example.com" },
  ];

  const batch = db.batch();
  users.forEach((user) => {
    batch.set(db.collection("users").doc(user.id), {
      name: user.name,
      color: user.color,
      email: user.email,
    });
  });
  await batch.commit();
}

async function seedHouses() {
  const db = getFirestore();
  await db.collection("houses").doc("house-main").set({
    name: "テストハウス",
    description: "テスト用の初期ハウス",
    ownerUid: "u-owner",
    memberUids: ["u-owner", "u-partner", "u-friend1", "u-friend2"],
    createdAt: "2026-03-01T00:00:00.000Z",
  });
}

async function seedTasks() {
  const db = getFirestore();
  const tasks = buildTaskSeeds();
  const batch = db.batch();
  tasks.forEach((task, index) => {
    batch.set(db.collection("tasks").doc(`task-${String(index + 1).padStart(3, "0")}`), task);
  });
  await batch.commit();
}

async function seedRules() {
  const db = getFirestore();
  const rules = [
    {
      id: "rule-001",
      title: "深夜の騒音を控える",
      body: "23時以降は通話・音楽の音量を下げる",
      category: "騒音",
      createdBy: "家主",
      createdAt: "2026-03-01T09:00:00.000Z",
      updatedAt: null,
      acknowledgedBy: ["家主"],
      deletedAt: null,
      deletedBy: null,
    },
    {
      id: "rule-002",
      title: "ゴミ出しルール",
      body: "可燃は火曜・金曜朝に出す",
      category: "ゴミ捨て",
      createdBy: "パートナー",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-02T08:30:00.000Z",
      acknowledgedBy: ["家主", "パートナー"],
      deletedAt: null,
      deletedBy: null,
    },
    {
      id: "rule-003",
      title: "来客時の共有",
      body: "来客時は前日までに共有チャットへ連絡",
      category: "来客",
      createdBy: "家主",
      createdAt: "2026-02-20T12:00:00.000Z",
      updatedAt: null,
      acknowledgedBy: [],
      deletedAt: "2026-02-28T12:00:00.000Z",
      deletedBy: "家主",
    },
  ];

  const batch = db.batch();
  rules.forEach((rule) => {
    const { id, ...payload } = rule;
    batch.set(db.collection("rules").doc(id), payload);
  });
  await batch.commit();
}

async function seedShoppingItems() {
  const db = getFirestore();
  const items = [
    {
      id: "shop-001",
      name: "トイレットペーパー",
      quantity: "12ロール",
      memo: "できれば2倍巻き",
      category: "日用品",
      addedBy: "家主",
      addedAt: "2026-03-02",
      checkedBy: null,
      checkedAt: null,
      canceledAt: null,
      canceledBy: null,
    },
    {
      id: "shop-002",
      name: "食器用洗剤",
      quantity: "1本",
      memo: "詰め替え用でも可",
      category: "消耗品",
      addedBy: "パートナー",
      addedAt: "2026-03-01",
      checkedBy: "友達１",
      checkedAt: "2026-03-02",
      canceledAt: null,
      canceledBy: null,
    },
    {
      id: "shop-003",
      name: "牛乳",
      quantity: "2本",
      memo: "低脂肪1本",
      category: "食費",
      addedBy: "友達２",
      addedAt: "2026-03-01",
      checkedBy: null,
      checkedAt: null,
      canceledAt: "2026-03-02",
      canceledBy: "友達２",
    },
  ];

  const batch = db.batch();
  items.forEach((item) => {
    const { id, ...payload } = item;
    batch.set(db.collection("shoppingItems").doc(id), payload);
  });
  await batch.commit();
}

async function seedExpenses() {
  const db = getFirestore();
  const expenses = [
    {
      id: "exp-001",
      title: "食材まとめ買い",
      amount: 6800,
      category: "食費",
      purchasedBy: "家主",
      purchasedAt: "2026-03-01",
      canceledAt: null,
      canceledBy: null,
      cancelReason: null,
    },
    {
      id: "exp-002",
      title: "トイレットペーパー",
      amount: 1580,
      category: "日用品",
      purchasedBy: "友達１",
      purchasedAt: "2026-03-02",
      canceledAt: null,
      canceledBy: null,
      cancelReason: null,
    },
    {
      id: "exp-003",
      title: "キッチン洗剤",
      amount: 420,
      category: "消耗品",
      purchasedBy: "パートナー",
      purchasedAt: "2026-03-01",
      canceledAt: "2026-03-02T09:15:00.000Z",
      canceledBy: "パートナー",
      cancelReason: "二重登録のため",
    },
  ];

  const batch = db.batch();
  expenses.forEach((expense) => {
    const { id, ...payload } = expense;
    batch.set(db.collection("expenses").doc(id), payload);
  });
  await batch.commit();
}

async function seedNotices() {
  const db = getFirestore();
  const notices = [
    {
      id: "notice-001",
      title: "3月の共益費について",
      body: "3/10までに各自15,000円の入金をお願いします",
      postedBy: "家主",
      postedAt: "2026-03-01T08:00:00.000Z",
      isImportant: true,
      deletedAt: null,
      deletedBy: null,
    },
    {
      id: "notice-002",
      title: "今週の掃除当番共有",
      body: "リビング掃除は週前半、風呂掃除は週後半で分担",
      postedBy: "パートナー",
      postedAt: "2026-03-01T11:00:00.000Z",
      isImportant: false,
      deletedAt: null,
      deletedBy: null,
    },
    {
      id: "notice-003",
      title: "旧連絡（テスト削除済み）",
      body: "この投稿は削除済みデータ検証用",
      postedBy: "家主",
      postedAt: "2026-02-15T09:00:00.000Z",
      isImportant: false,
      deletedAt: "2026-02-20T09:00:00.000Z",
      deletedBy: "家主",
    },
  ];

  const batch = db.batch();
  notices.forEach((notice) => {
    const { id, ...payload } = notice;
    batch.set(db.collection("notices").doc(id), payload);
  });
  await batch.commit();
}

async function seedContributionSettings() {
  const db = getFirestore();
  const month = toJstMonthKey(new Date("2026-03-02T00:00:00.000Z"));
  await db
    .collection("contributionSettings")
    .doc(month)
    .set({
      monthlyAmountPerPerson: 15000,
      memberCount: 4,
      effectiveMonth: month,
    });
}

async function seedTaskCompletions() {
  const db = getFirestore();
  const records = [
    {
      id: "comp-001",
      taskId: "task-001",
      taskName: "【料理】共有の食事",
      points: 20,
      completedBy: "家主",
      completedAt: "2026-03-01T07:00:00.000Z",
      source: "app",
      canceledAt: null,
      canceledBy: null,
      cancelReason: null,
    },
    {
      id: "comp-002",
      taskId: "task-020",
      taskName: "【リビング】掃除機がけ",
      points: 30,
      completedBy: "友達１",
      completedAt: "2026-03-01T12:30:00.000Z",
      source: "app",
      canceledAt: null,
      canceledBy: null,
      cancelReason: null,
    },
    {
      id: "comp-003",
      taskId: "task-026",
      taskName: "【ゴミ出し】可燃",
      points: 20,
      completedBy: "パートナー",
      completedAt: "2026-03-02T05:30:00.000Z",
      source: "app",
      canceledAt: "2026-03-02T06:00:00.000Z",
      canceledBy: "パートナー",
      cancelReason: "誤操作のため",
    },
  ];

  const batch = db.batch();
  records.forEach((record) => {
    const { id, ...payload } = record;
    batch.set(db.collection("taskCompletions").doc(id), payload);
  });
  await batch.commit();
}

async function seedAuditLogs() {
  const db = getFirestore();
  const logs = [
    {
      id: "audit-001",
      action: "rule_created",
      actor: "家主",
      source: "app",
      createdAt: "2026-03-01T09:00:00.000Z",
      details: { ruleId: "rule-001", title: "深夜の騒音を控える" },
    },
    {
      id: "audit-002",
      action: "notice_created",
      actor: "パートナー",
      source: "app",
      createdAt: "2026-03-01T11:00:00.000Z",
      details: { noticeId: "notice-002", isImportant: false },
    },
    {
      id: "audit-003",
      action: "task_completion_canceled",
      actor: "パートナー",
      source: "app",
      createdAt: "2026-03-02T06:00:00.000Z",
      details: { completionId: "comp-003", reason: "誤操作のため" },
    },
  ];

  const batch = db.batch();
  logs.forEach((log) => {
    const { id, ...payload } = log;
    batch.set(db.collection("auditLogs").doc(id), payload);
  });
  await batch.commit();
}

async function resetIfRequested() {
  const shouldReset = process.argv.includes("--reset");
  if (!shouldReset) return;

  const collections = [
    "auditLogs",
    "taskCompletions",
    "tasks",
    "expenses",
    "shoppingItems",
    "rules",
    "notices",
    "contributionSettings",
    "houses",
    "users",
  ];

  for (const collection of collections) {
    await clearCollection(collection);
  }
}

async function main() {
  ensureEnvLoaded();
  ensureEmulator();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    "demo-sharehouse-work";

  if (getApps().length === 0) {
    initializeApp({ projectId });
  }

  await resetIfRequested();

  await seedUsers();
  await seedHouses();
  await seedTasks();
  await seedRules();
  await seedShoppingItems();
  await seedExpenses();
  await seedNotices();
  await seedContributionSettings();
  await seedTaskCompletions();
  await seedAuditLogs();

  await getFirestore().collection("_meta").doc("seedInfo").set({
    seededAt: FieldValue.serverTimestamp(),
    seededBy: "scripts/seed-firestore.ts",
    reset: process.argv.includes("--reset"),
  });

  console.log("Seed completed.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
