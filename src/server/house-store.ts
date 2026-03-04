import { getAdminFirestore } from "@/lib/firebase-admin";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { House } from "@/types";

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

type CreateHouseInput = {
  name: string;
  description?: string;
  ownerUid?: string;
  joinPassword?: string;
};

function docToHouse(id: string, data: FirebaseFirestore.DocumentData): House {
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

export async function createHouse(input: CreateHouseInput): Promise<House> {
  const db = getAdminFirestore();
  const memberUids = input.ownerUid ? [input.ownerUid] : [];
  const hostUids = input.ownerUid ? [input.ownerUid] : [];
  const data: FirebaseFirestore.DocumentData = {
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
  const ref = await db.collection(COLLECTION).add(data);
  return docToHouse(ref.id, data);
}

export async function getHouse(houseId: string): Promise<House | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(COLLECTION).doc(houseId).get();
  if (!doc.exists) return null;
  return docToHouse(doc.id, doc.data()!);
}

export async function listHouses(uid: string): Promise<House[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .where("memberUids", "array-contains", uid)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => docToHouse(doc.id, doc.data()));
}

export async function addHouseMember(houseId: string, userUid: string): Promise<House | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(houseId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  const current = Array.isArray(data.memberUids) ? data.memberUids : [];
  if (current.includes(userUid)) {
    return docToHouse(houseId, data);
  }

  const memberUids = [...current, userUid];
  await ref.update({ memberUids });
  return docToHouse(houseId, { ...data, memberUids });
}

export async function findHouseByNameAndJoinPassword(
  name: string,
  joinPassword: string
): Promise<House | null> {
  const db = getAdminFirestore();
  // Query by name only, then verify the password hash to prevent timing attacks
  const snapshot = await db
    .collection(COLLECTION)
    .where("name", "==", name)
    .get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const stored: string | undefined = data.joinPasswordHash;
    if (stored && await verifyJoinPassword(joinPassword, stored)) {
      return docToHouse(doc.id, data);
    }
  }
  return null;
}

export async function grantHostRole(houseId: string, userUid: string): Promise<House | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(houseId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  const current = Array.isArray(data.hostUids) ? data.hostUids : [];
  if (current.includes(userUid)) {
    return docToHouse(houseId, data);
  }

  const hostUids = [...current, userUid];
  await ref.update({ hostUids });
  return docToHouse(houseId, { ...data, hostUids });
}

export async function getFirstHouseId(): Promise<string | null> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0]!.id;
}

export async function revokeHostRole(houseId: string, userUid: string): Promise<House | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(houseId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
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
