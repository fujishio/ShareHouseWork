/**
 * Migration: hash plaintext joinPassword fields in Firestore houses collection.
 *
 * Run once after deploying the TASK-P5 security fix:
 *   node --experimental-strip-types scripts/migrate-hash-join-passwords.ts
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local
 */

import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Load .env.local
import { readFileSync } from "fs";
const envContent = readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^"(.*)"$/, "$1");
    process.env[key] = value;
  }
}

const scryptAsync = promisify(scrypt);

async function hashJoinPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function main() {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });

  const db = getFirestore();
  const snapshot = await db.collection("houses").get();

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.joinPasswordHash) {
      console.log(`[skip] ${doc.id}: already hashed`);
      skipped++;
      continue;
    }

    if (!data.joinPassword || typeof data.joinPassword !== "string") {
      console.log(`[skip] ${doc.id}: no plaintext joinPassword`);
      skipped++;
      continue;
    }

    const hash = await hashJoinPassword(data.joinPassword);
    await doc.ref.update({
      joinPasswordHash: hash,
      joinPassword: null, // clear plaintext; use FieldValue.delete() if preferred
    });
    console.log(`[done] ${doc.id}: hashed and cleared plaintext`);
    migrated++;
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
