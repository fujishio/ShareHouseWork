import { getAdminFirestore } from "../lib/firebase-admin.ts";
import { FieldPath } from "firebase-admin/firestore";
import type { Member, FirestoreMemberDoc } from "../types/index.ts";
import { z } from "zod";
import { listCollection, readCollectionDoc } from "./store-utils.ts";

const COLLECTION = "users";

const memberDocSchema: z.ZodType<FirestoreMemberDoc> = z.object({
  name: z.string(),
  color: z.string(),
  email: z.string().optional(),
});

function docToMember(id: string, data: FirestoreMemberDoc): Member | null {
  const parsed = memberDocSchema.safeParse(data);
  if (!parsed.success) return null;
  return { id, ...parsed.data };
}

export async function readUserById(
  uid: string,
  db?: FirebaseFirestore.Firestore
): Promise<Member | null> {
  const user = await readCollectionDoc({
    db,
    collection: COLLECTION,
    id: uid,
    mapDoc: docToMember,
  });
  return user ?? null;
}

export async function listUsers(
  memberUids?: string[],
  db?: FirebaseFirestore.Firestore
): Promise<Member[]> {
  if (memberUids && memberUids.length === 0) {
    return [];
  }

  const users = await listCollection({
    db,
    collection: COLLECTION,
    where:
      memberUids && memberUids.length > 0
        ? [{ field: FieldPath.documentId(), op: "in", value: memberUids }]
        : [],
    mapDoc: docToMember,
  });

  return users
    .filter((member): member is Member => member !== null);
}

export async function createOrUpdateUser(
  uid: string,
  data: { name: string; color: string; email: string },
  db?: FirebaseFirestore.Firestore
): Promise<Member> {
  const firestore = db ?? getAdminFirestore();
  await firestore.collection(COLLECTION).doc(uid).set(data, { merge: true });
  return { id: uid, ...data };
}

export async function deleteUserById(
  uid: string,
  db?: FirebaseFirestore.Firestore
): Promise<void> {
  const firestore = db ?? getAdminFirestore();
  await firestore.collection(COLLECTION).doc(uid).delete();
}

export const getUser = readUserById;
export const upsertUser = createOrUpdateUser;
export const deleteUser = deleteUserById;
