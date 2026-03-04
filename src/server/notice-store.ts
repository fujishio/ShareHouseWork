import type { Notice, CreateNoticeInput } from "@/types";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "@/server/store-utils";

const COLLECTION = "notices";

function docToNotice(id: string, data: FirebaseFirestore.DocumentData): Notice {
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

export async function readNotices(houseId: string): Promise<Notice[]> {
  return readCollection({
    collection: COLLECTION,
    whereEquals: [{ field: "houseId", value: houseId }],
    orderBy: { field: "postedAt", direction: "desc" },
    mapDoc: docToNotice,
  });
}

export async function appendNotice(input: CreateNoticeInput): Promise<Notice> {
  const data = {
    ...input,
    deletedAt: null,
    deletedBy: null,
  };
  return addCollectionDoc({ collection: COLLECTION, data, mapDoc: docToNotice });
}

export async function deleteNotice(
  noticeId: string,
  deletedBy: string,
  deletedAt: string
): Promise<Notice | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: noticeId,
    shouldUpdate: (data) => !data.deletedAt,
    updates: { deletedAt, deletedBy },
    onGuardFail: "return-existing",
    mapDoc: docToNotice,
  });
}
