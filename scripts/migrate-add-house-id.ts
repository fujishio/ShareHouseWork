/**
 * Migration: Add houseId to all Firestore documents
 *
 * This script backfills the houseId field to existing documents in all collections.
 * It requires exactly one house to exist in the database.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx scripts/migrate-add-house-id.ts
 *   # Or for production (be careful!):
 *   npx tsx scripts/migrate-add-house-id.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { toJstMonthKey } from "../src/shared/lib/time.ts";

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

async function migrateCollection(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  houseId: string
) {
  const snapshot = await db.collection(collectionName).get();
  let updated = 0;
  let skipped = 0;

  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.houseId === houseId) {
      skipped++;
      continue;
    }

    batch.update(doc.ref, { houseId });
    batchCount++;
    updated++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`  ${collectionName}: ${updated} updated, ${skipped} skipped`);
}

async function migrateContributionSettings(
  db: FirebaseFirestore.Firestore,
  houseId: string
) {
  const snapshot = await db.collection("contributionSettings").get();
  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const docId = doc.id;

    // Skip if already migrated (docId starts with houseId_)
    if (docId.startsWith(`${houseId}_`)) {
      skipped++;
      continue;
    }

    // Old docId is YYYY-MM, new docId is {houseId}_{YYYY-MM}
    const monthKey = docId; // assume old docId is the month key
    const newDocId = `${houseId}_${monthKey}`;

    const newData = { ...data, houseId };

    await db.collection("contributionSettings").doc(newDocId).set(newData);
    await doc.ref.delete();
    migrated++;
  }

  console.log(`  contributionSettings: ${migrated} migrated to new docId format, ${skipped} skipped`);
}

async function main() {
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  loadEnvFile(resolve(process.cwd(), ".env"));

  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    "demo-sharehouse-work";

  if (getApps().length === 0) {
    initializeApp({ projectId });
  }

  const db = getFirestore();

  // Step 1: Find the house
  const housesSnapshot = await db.collection("houses").get();
  if (housesSnapshot.empty) {
    throw new Error("No houses found in database. Cannot determine houseId.");
  }
  if (housesSnapshot.size > 1) {
    console.warn(
      `WARNING: ${housesSnapshot.size} houses found. This migration supports single-house setups only.`
    );
    console.warn("Houses found:");
    housesSnapshot.docs.forEach((doc) => {
      console.warn(`  - ${doc.id}: ${JSON.stringify(doc.data().name)}`);
    });
    throw new Error("Multiple houses found. Aborting migration.");
  }

  const houseId = housesSnapshot.docs[0]!.id;
  console.log(`Migrating with houseId: ${houseId}`);

  // Step 2: Migrate each collection
  const simpleCollections = [
    "tasks",
    "taskCompletions",
    "expenses",
    "shoppingItems",
    "rules",
    "notices",
    "auditLogs",
  ];

  for (const collection of simpleCollections) {
    await migrateCollection(db, collection, houseId);
  }

  // Step 3: Migrate contributionSettings (requires docId change)
  await migrateContributionSettings(db, houseId);

  console.log("Migration completed successfully.");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
