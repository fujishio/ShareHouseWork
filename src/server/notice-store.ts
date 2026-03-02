import { getAdminFirestore } from "@/lib/firebase-admin";
import type { Notice, CreateNoticeInput } from "@/types";

const COLLECTION = "notices";

function docToNotice(id: string, data: FirebaseFirestore.DocumentData): Notice {
  return {
    id,
    title: data.title,
    body: data.body,
    postedBy: data.postedBy,
    postedAt: data.postedAt,
    isImportant: data.isImportant,
    deletedAt: data.deletedAt ?? undefined,
    deletedBy: data.deletedBy ?? undefined,
  };
}

export async function readNotices(): Promise<Notice[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("postedAt", "desc")
    .get();
  return snapshot.docs.map((doc) => docToNotice(doc.id, doc.data()));
}

export async function appendNotice(input: CreateNoticeInput): Promise<Notice> {
  const db = getAdminFirestore();
  const data = {
    ...input,
    deletedAt: null,
    deletedBy: null,
  };
  const ref = await db.collection(COLLECTION).add(data);
  return docToNotice(ref.id, data);
}

export async function deleteNotice(
  noticeId: string,
  deletedBy: string,
  deletedAt: string
): Promise<Notice | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(noticeId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.deletedAt) return docToNotice(noticeId, data);

  const updated = { deletedAt, deletedBy };
  await ref.update(updated);
  return docToNotice(noticeId, { ...data, ...updated });
}
