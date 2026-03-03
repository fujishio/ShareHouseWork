import { getAdminFirestore } from "@/lib/firebase-admin";
import type { Member } from "@/types";
import { z } from "zod";

const COLLECTION = "users";

const memberDocSchema = z.object({
  name: z.string(),
  color: z.string(),
  email: z.string().optional(),
});

function docToMember(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): Member | null {
  const parsed = memberDocSchema.safeParse(data);
  if (!parsed.success) return null;
  return { id, ...parsed.data };
}

export async function getUser(uid: string): Promise<Member | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(COLLECTION).doc(uid).get();
  if (!doc.exists) return null;
  return docToMember(doc.id, doc.data());
}

export async function listUsers(): Promise<Member[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs
    .map((doc) => docToMember(doc.id, doc.data()))
    .filter((member): member is Member => member !== null);
}

export async function upsertUser(uid: string, data: { name: string; color: string; email: string }): Promise<Member> {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(uid).set(data, { merge: true });
  return { id: uid, ...data };
}
