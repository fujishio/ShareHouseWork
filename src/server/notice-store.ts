import type { Notice, CreateNoticeInput, FirestoreNoticeDoc } from "../types/index.ts";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "./store-utils.ts";

const COLLECTION = "notices";

function docToNotice(id: string, data: FirestoreNoticeDoc): Notice {
  return {
    id,
    houseId: data.houseId,
    title: data.title,
    body: data.body,
    postedBy: data.postedBy,
    postedAt: data.postedAt,
    isImportant: data.isImportant,
    deletedAt: data.deletedAt ?? undefined,
    deletedBy: data.deletedBy ?? undefined,
  };
}

export async function listNotices(
  houseId: string,
  db?: FirebaseFirestore.Firestore
): Promise<Notice[]> {
  return readCollection({
    db,
    collection: COLLECTION,
    whereEquals: [{ field: "houseId", value: houseId }],
    orderBy: { field: "postedAt", direction: "desc" },
    mapDoc: docToNotice,
  });
}

export async function createNotice(
  input: CreateNoticeInput,
  db?: FirebaseFirestore.Firestore
): Promise<Notice> {
  const data: FirestoreNoticeDoc = {
    ...input,
    deletedAt: null,
    deletedBy: null,
  };
  return addCollectionDoc({ db, collection: COLLECTION, data, mapDoc: docToNotice });
}

export async function updateNoticeDeletion(
  noticeId: string,
  deletedBy: string,
  deletedAt: string,
  db?: FirebaseFirestore.Firestore
): Promise<Notice | null> {
  return updateCollectionDocConditionally({
    db,
    collection: COLLECTION,
    id: noticeId,
    shouldUpdate: (data) => !data.deletedAt,
    updates: { deletedAt, deletedBy },
    onGuardFail: "return-existing",
    mapDoc: docToNotice,
  });
}

export const readNotices = listNotices;
export const appendNotice = createNotice;
export const deleteNotice = updateNoticeDeletion;
