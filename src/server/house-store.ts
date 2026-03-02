import { getAdminFirestore } from "@/lib/firebase-admin";
import type { House } from "@/types";

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
    data.joinPassword = input.joinPassword;
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

export async function listHouses(): Promise<House[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();
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
  const snapshot = await db
    .collection(COLLECTION)
    .where("name", "==", name)
    .where("joinPassword", "==", joinPassword)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return docToHouse(doc.id, doc.data());
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
