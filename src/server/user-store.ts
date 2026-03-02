import { getAdminFirestore } from "@/lib/firebase-admin";
import type { Member } from "@/types";

const COLLECTION = "users";

export async function getUser(uid: string): Promise<Member | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(COLLECTION).doc(uid).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Member;
}

export async function listUsers(): Promise<Member[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Member);
}

export async function upsertUser(uid: string, data: { name: string; color: string; email: string }): Promise<Member> {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(uid).set(data, { merge: true });
  return { id: uid, ...data };
}
