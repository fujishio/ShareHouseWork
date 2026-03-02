import { getAdminFirestore } from "@/lib/firebase-admin";
import type { House } from "@/types";

const COLLECTION = "houses";

type CreateHouseInput = {
  name: string;
  description?: string;
  ownerUid?: string;
};

function docToHouse(id: string, data: FirebaseFirestore.DocumentData): House {
  return {
    id,
    name: data.name,
    description: data.description ?? undefined,
    ownerUid: data.ownerUid ?? undefined,
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    createdAt: data.createdAt,
  };
}

export async function createHouse(input: CreateHouseInput): Promise<House> {
  const db = getAdminFirestore();
  const memberUids = input.ownerUid ? [input.ownerUid] : [];
  const data = {
    name: input.name,
    description: input.description ?? "",
    ownerUid: input.ownerUid ?? null,
    memberUids,
    createdAt: new Date().toISOString(),
  };
  const ref = await db.collection(COLLECTION).add(data);
  return docToHouse(ref.id, data);
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
