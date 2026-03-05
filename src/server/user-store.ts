import { getAdminFirestore } from "@/lib/firebase-admin";
import { FieldPath } from "firebase-admin/firestore";
import type { Member, FirestoreMemberDoc } from "@/types";
import { z } from "zod";
import { listCollection, readCollectionDoc } from "@/server/store-utils";

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

export async function readUserById(uid: string): Promise<Member | null> {
  const user = await readCollectionDoc({
    collection: COLLECTION,
    id: uid,
    mapDoc: docToMember,
  });
  return user ?? null;
}

export async function listUsers(memberUids?: string[]): Promise<Member[]> {
  if (memberUids && memberUids.length === 0) {
    return [];
  }

  const users = await listCollection({
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
  data: { name: string; color: string; email: string }
): Promise<Member> {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(uid).set(data, { merge: true });
  return { id: uid, ...data };
}

export async function deleteUserById(uid: string): Promise<void> {
  const db = getAdminFirestore();
  await db.collection(COLLECTION).doc(uid).delete();
}

export const getUser = readUserById;
export const upsertUser = createOrUpdateUser;
export const deleteUser = deleteUserById;
