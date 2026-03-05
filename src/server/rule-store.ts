import type { Rule, CreateRuleInput, UpdateRuleInput, FirestoreRuleDoc } from "../types/index.ts";
import { getAdminFirestore } from "../lib/firebase-admin.ts";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "./store-utils.ts";

const COLLECTION = "rules";

function docToRule(id: string, data: FirestoreRuleDoc): Rule {
  return {
    id,
    houseId: data.houseId,
    title: data.title,
    body: data.body,
    category: data.category,
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt ?? undefined,
    acknowledgedBy: data.acknowledgedBy ?? [],
    deletedAt: data.deletedAt ?? undefined,
    deletedBy: data.deletedBy ?? undefined,
  };
}

export async function listRules(
  houseId: string,
  db?: FirebaseFirestore.Firestore
): Promise<Rule[]> {
  return readCollection({
    db,
    collection: COLLECTION,
    whereEquals: [{ field: "houseId", value: houseId }],
    orderBy: { field: "createdAt", direction: "desc" },
    mapDoc: docToRule,
  });
}

export async function createRule(
  input: CreateRuleInput,
  db?: FirebaseFirestore.Firestore
): Promise<Rule> {
  const data: FirestoreRuleDoc = {
    ...input,
    updatedAt: null,
    acknowledgedBy: [],
    deletedAt: null,
    deletedBy: null,
  };
  return addCollectionDoc({ db, collection: COLLECTION, data, mapDoc: docToRule });
}

export async function updateRule(
  ruleId: string,
  input: UpdateRuleInput,
  db?: FirebaseFirestore.Firestore
): Promise<Rule | null> {
  return updateCollectionDocConditionally({
    db,
    collection: COLLECTION,
    id: ruleId,
    shouldUpdate: (data) => !data.deletedAt,
    updates: { ...input },
    onGuardFail: "return-null",
    mapDoc: docToRule,
  });
}

export async function acknowledgeRule(
  ruleId: string,
  memberName: string,
  db?: FirebaseFirestore.Firestore
): Promise<Rule | null> {
  const firestore = db ?? getAdminFirestore();
  const ref = firestore.collection(COLLECTION).doc(ruleId);
  const doc = await ref.get();
  const data = doc.data() as FirestoreRuleDoc | undefined;
  if (!doc.exists || !data || data.deletedAt) return null;

  const current: string[] = data.acknowledgedBy ?? [];
  if (current.includes(memberName)) return docToRule(ruleId, data);

  const acknowledgedBy = [...current, memberName];
  await ref.update({ acknowledgedBy });
  return docToRule(ruleId, { ...data, acknowledgedBy });
}

export async function updateRuleDeletion(
  ruleId: string,
  deletedBy: string,
  deletedAt: string,
  db?: FirebaseFirestore.Firestore
): Promise<Rule | null> {
  return updateCollectionDocConditionally({
    db,
    collection: COLLECTION,
    id: ruleId,
    shouldUpdate: (data) => !data.deletedAt,
    updates: { deletedAt, deletedBy },
    onGuardFail: "return-existing",
    mapDoc: docToRule,
  });
}

export async function readRuleById(
  ruleId: string,
  db?: FirebaseFirestore.Firestore
): Promise<Rule | null> {
  const { readCollectionDoc } = await import("./store-utils.ts");
  return readCollectionDoc({ db, collection: COLLECTION, id: ruleId, mapDoc: docToRule });
}

export const readRules = listRules;
export const readRule = readRuleById;
export const appendRule = createRule;
export const deleteRule = updateRuleDeletion;
