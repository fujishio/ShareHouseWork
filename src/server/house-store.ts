import { getAdminFirestore } from "../lib/firebase-admin.ts";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { House, FirestoreHouseDoc, FirestoreTaskDoc } from "../types/index.ts";
import { TASK_CATEGORIES } from "../shared/constants/task.ts";
import { TASK_DEFINITIONS } from "../domain/tasks/task-definitions.ts";

const scryptAsync = promisify(scrypt);

async function hashJoinPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function verifyJoinPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const storedHash = Buffer.from(hashHex, "hex");
  const derivedHash = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(storedHash, derivedHash);
}

const COLLECTION = "houses";
const TASKS_COLLECTION = "tasks";

type CreateHouseInput = {
  name: string;
  description?: string;
  ownerUid?: string;
  joinPassword?: string;
};

function docToHouse(id: string, data: FirestoreHouseDoc): House {
  return {
    id,
    name: data.name,
    description: data.description ?? undefined,
    ownerUid: data.ownerUid ?? undefined,
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    hostUids: Array.isArray(data.hostUids) ? data.hostUids : [],
    createdAt: data.createdAt,
  };
}

function buildDefaultTasks(houseId: string): FirestoreTaskDoc[] {
  return TASK_CATEGORIES.flatMap((category) =>
    TASK_DEFINITIONS[category].map((task) => ({
      houseId,
      name: task.name,
      category,
      points: task.points,
      frequencyDays: task.frequencyDays,
      displayOrder: task.displayOrder,
      deletedAt: null,
    }))
  );
}

export async function createHouse(
  input: CreateHouseInput,
  db?: FirebaseFirestore.Firestore
): Promise<House> {
  const firestore = db ?? getAdminFirestore();
  const memberUids = input.ownerUid ? [input.ownerUid] : [];
  const hostUids = input.ownerUid ? [input.ownerUid] : [];
  const data: FirestoreHouseDoc = {
    name: input.name,
    description: input.description ?? "",
    ownerUid: input.ownerUid ?? null,
    memberUids,
    hostUids,
    createdAt: new Date().toISOString(),
  };
  if (input.joinPassword) {
    // Store as scrypt hash, never as plaintext
    data.joinPasswordHash = await hashJoinPassword(input.joinPassword);
  }

  const houseRef = firestore.collection(COLLECTION).doc();
  const batch = firestore.batch();
  batch.set(houseRef, data);

  const defaultTasks = buildDefaultTasks(houseRef.id);
  defaultTasks.forEach((task) => {
    batch.set(firestore.collection(TASKS_COLLECTION).doc(), task);
  });

  await batch.commit();
  return docToHouse(houseRef.id, data);
}

export async function readHouseById(
  houseId: string,
  db?: FirebaseFirestore.Firestore
): Promise<House | null> {
  const firestore = db ?? getAdminFirestore();
  const doc = await firestore.collection(COLLECTION).doc(houseId).get();
  if (!doc.exists) return null;
  return docToHouse(doc.id, doc.data() as FirestoreHouseDoc);
}

export async function listHousesByMemberUid(
  uid: string,
  db?: FirebaseFirestore.Firestore
): Promise<House[]> {
  const firestore = db ?? getAdminFirestore();
  try {
    const snapshot = await firestore
      .collection(COLLECTION)
      .where("memberUids", "array-contains", uid)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((doc) => docToHouse(doc.id, doc.data() as FirestoreHouseDoc));
  } catch (error) {
    // If index build is not ready yet, fall back to local sort.
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("FAILED_PRECONDITION")) {
      throw error;
    }

    const fallbackSnapshot = await firestore
      .collection(COLLECTION)
      .where("memberUids", "array-contains", uid)
      .get();
    return fallbackSnapshot.docs
      .map((doc) => docToHouse(doc.id, doc.data() as FirestoreHouseDoc))
      .sort((a, b) => {
        const aTime = Number.isNaN(Date.parse(a.createdAt)) ? 0 : Date.parse(a.createdAt);
        const bTime = Number.isNaN(Date.parse(b.createdAt)) ? 0 : Date.parse(b.createdAt);
        return bTime - aTime;
      });
  }
}

export async function updateHouseMemberAddition(
  houseId: string,
  userUid: string,
  db?: FirebaseFirestore.Firestore
): Promise<House | null> {
  const firestore = db ?? getAdminFirestore();
  const ref = firestore.collection(COLLECTION).doc(houseId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data() as FirestoreHouseDoc;
  const current = Array.isArray(data.memberUids) ? data.memberUids : [];
  if (current.includes(userUid)) {
    return docToHouse(houseId, data);
  }

  const memberUids = [...current, userUid];
  await ref.update({ memberUids });
  return docToHouse(houseId, { ...data, memberUids });
}

export async function readHouseByNameAndJoinPassword(
  name: string,
  joinPassword: string,
  db?: FirebaseFirestore.Firestore
): Promise<House | null> {
  const firestore = db ?? getAdminFirestore();
  // Query by name only, then verify the password hash to prevent timing attacks
  const snapshot = await firestore
    .collection(COLLECTION)
    .where("name", "==", name)
    .get();
  for (const doc of snapshot.docs) {
    const data = doc.data() as FirestoreHouseDoc;
    const stored: string | undefined = data.joinPasswordHash;
    if (stored && await verifyJoinPassword(joinPassword, stored)) {
      return docToHouse(doc.id, data);
    }
  }
  return null;
}

export async function updateHouseHostRoleGrant(
  houseId: string,
  userUid: string,
  db?: FirebaseFirestore.Firestore
): Promise<House | null> {
  const firestore = db ?? getAdminFirestore();
  const ref = firestore.collection(COLLECTION).doc(houseId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data() as FirestoreHouseDoc;
  const current = Array.isArray(data.hostUids) ? data.hostUids : [];
  if (current.includes(userUid)) {
    return docToHouse(houseId, data);
  }

  const hostUids = [...current, userUid];
  await ref.update({ hostUids });
  return docToHouse(houseId, { ...data, hostUids });
}

export async function readFirstHouseId(
  db?: FirebaseFirestore.Firestore
): Promise<string | null> {
  const firestore = db ?? getAdminFirestore();
  const snapshot = await firestore.collection(COLLECTION).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0]!.id;
}

export async function updateHouseHostRoleRevoke(
  houseId: string,
  userUid: string,
  db?: FirebaseFirestore.Firestore
): Promise<House | null> {
  const firestore = db ?? getAdminFirestore();
  const ref = firestore.collection(COLLECTION).doc(houseId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data() as FirestoreHouseDoc;
  const current = Array.isArray(data.hostUids) ? data.hostUids : [];
  if (!current.includes(userUid)) {
    return docToHouse(houseId, data);
  }
  if (current.length <= 1) {
    return null; // last host cannot be removed — caller should treat this as 400
  }

  const hostUids = current.filter((uid: string) => uid !== userUid);
  await ref.update({ hostUids });
  return docToHouse(houseId, { ...data, hostUids });
}

export const getHouse = readHouseById;
export const listHouses = listHousesByMemberUid;
export const addHouseMember = updateHouseMemberAddition;
export const findHouseByNameAndJoinPassword = readHouseByNameAndJoinPassword;
export const grantHostRole = updateHouseHostRoleGrant;
export const getFirstHouseId = readFirstHouseId;
export const revokeHostRole = updateHouseHostRoleRevoke;
