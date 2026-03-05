import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { deleteUser as deleteUserDoc } from "@/server/user-store";
import { syncContributionMemberCountForCurrentMonth } from "@/server/contribution-settings-store";
import {
  buildHouseExitPatch,
  buildStringFieldAnonymizePatch,
  getHouseScopedCollections,
  partitionHostedHouses,
  replaceNameInStringArray,
  type AccountDeletionHouseRecord,
} from "@/server/account-deletion-logic";

export const DELETED_USER_LABEL = "退会済みユーザー";

type AccountDeletionResult = {
  anonymizedFieldUpdates: number;
  affectedHouses: number;
};

const FIELD_ANONYMIZE_TARGETS: Array<{ collection: string; fields: string[] }> = [
  { collection: "taskCompletions", fields: ["completedBy", "canceledBy"] },
  { collection: "expenses", fields: ["purchasedBy", "canceledBy"] },
  { collection: "shoppingItems", fields: ["addedBy", "checkedBy", "canceledBy"] },
  { collection: "rules", fields: ["createdBy", "deletedBy"] },
  { collection: "notices", fields: ["postedBy", "deletedBy"] },
  { collection: "auditLogs", fields: ["actor"] },
];

function toHouseRecord(id: string, data: FirebaseFirestore.DocumentData): AccountDeletionHouseRecord {
  return {
    id,
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : null,
    memberUids: Array.isArray(data.memberUids) ? data.memberUids : [],
    hostUids: Array.isArray(data.hostUids) ? data.hostUids : [],
  };
}

async function listActorHouses(uid: string): Promise<AccountDeletionHouseRecord[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("houses").where("memberUids", "array-contains", uid).get();
  return snapshot.docs.map((doc) => toHouseRecord(doc.id, doc.data()));
}

async function removeActorFromHouses(uid: string, houses: AccountDeletionHouseRecord[]): Promise<void> {
  const db = getAdminFirestore();
  const updates = houses.map(async (house) => {
    const { memberUids, hostUids, ownerUid } = buildHouseExitPatch(uid, house);

    await db.collection("houses").doc(house.id).update({ memberUids, hostUids, ownerUid });
    await syncContributionMemberCountForCurrentMonth(house.id, memberUids.length);
  });
  await Promise.all(updates);
}

async function updateDocsInChunks(
  updates: Array<{
    ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
    data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
  }>
): Promise<void> {
  if (updates.length === 0) return;

  const db = getAdminFirestore();
  const CHUNK_SIZE = 400;
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const batch = db.batch();
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    for (const item of chunk) {
      batch.update(item.ref, item.data);
    }
    await batch.commit();
  }
}

async function deleteDocsInHouse(
  collection: string,
  houseId: string
): Promise<void> {
  const db = getAdminFirestore();
  const snapshot = await db.collection(collection).where("houseId", "==", houseId).get();
  const deletes = snapshot.docs.map((doc) => ({
    ref: doc.ref,
    data: {},
  }));

  if (deletes.length === 0) return;

  const CHUNK_SIZE = 400;
  for (let i = 0; i < deletes.length; i += CHUNK_SIZE) {
    const batch = db.batch();
    const chunk = deletes.slice(i, i + CHUNK_SIZE);
    for (const item of chunk) {
      batch.delete(item.ref);
    }
    await batch.commit();
  }
}

async function deleteHousesAndHouseData(houseIds: string[]): Promise<void> {
  if (houseIds.length === 0) return;
  const db = getAdminFirestore();
  const collections = getHouseScopedCollections();

  for (const houseId of houseIds) {
    for (const collection of collections) {
      await deleteDocsInHouse(collection, houseId);
    }
    await db.collection("houses").doc(houseId).delete();
  }
}

async function anonymizeStringFieldsInHouse(
  houseId: string,
  targetName: string
): Promise<number> {
  const db = getAdminFirestore();
  let updatedCount = 0;

  for (const target of FIELD_ANONYMIZE_TARGETS) {
    const snapshot = await db.collection(target.collection).where("houseId", "==", houseId).get();
    const updates: Array<{
      ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
      data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
    }> = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const patch = buildStringFieldAnonymizePatch(
        data,
        target.fields,
        targetName,
        DELETED_USER_LABEL
      );
      if (Object.keys(patch).length > 0) {
        updates.push({ ref: doc.ref, data: patch });
      }
    }

    await updateDocsInChunks(updates);
    updatedCount += updates.length;
  }

  return updatedCount;
}

async function anonymizeRuleAcknowledgementsInHouse(
  houseId: string,
  targetName: string
): Promise<number> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("rules").where("houseId", "==", houseId).get();
  const updates: Array<{
    ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
    data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
  }> = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const replaced = replaceNameInStringArray(
      data.acknowledgedBy,
      targetName,
      DELETED_USER_LABEL
    );
    if (!replaced) {
      continue;
    }
    updates.push({
      ref: doc.ref,
      data: {
        acknowledgedBy: replaced,
      },
    });
  }

  await updateDocsInChunks(updates);
  return updates.length;
}

async function anonymizeUserReferences(
  houses: AccountDeletionHouseRecord[],
  name: string
): Promise<AccountDeletionResult> {
  const houseIds = houses.map((house) => house.id);
  let anonymizedFieldUpdates = 0;

  for (const houseId of houseIds) {
    anonymizedFieldUpdates += await anonymizeStringFieldsInHouse(houseId, name);
    anonymizedFieldUpdates += await anonymizeRuleAcknowledgementsInHouse(houseId, name);
  }

  return {
    anonymizedFieldUpdates,
    affectedHouses: houseIds.length,
  };
}

async function deleteAuthUser(uid: string): Promise<void> {
  try {
    await getAdminAuth().deleteUser(uid);
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null ? Reflect.get(error, "code") : null;
    if (code === "auth/user-not-found") {
      return;
    }
    throw error;
  }
}

export async function deleteAccountAndAnonymize(input: {
  uid: string;
  displayName: string;
}): Promise<AccountDeletionResult> {
  const houses = await listActorHouses(input.uid);
  const { hosted, memberOnly } = partitionHostedHouses(input.uid, houses);

  const anonymizedResult = await anonymizeUserReferences(memberOnly, input.displayName);
  await deleteHousesAndHouseData(hosted.map((house) => house.id));
  await removeActorFromHouses(input.uid, memberOnly);
  await deleteUserDoc(input.uid);
  await deleteAuthUser(input.uid);

  return anonymizedResult;
}
