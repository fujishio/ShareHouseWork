import type { Rule, CreateRuleInput, UpdateRuleInput, FirestoreRuleDoc } from "@/types";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "@/server/store-utils";

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

export async function listRules(houseId: string): Promise<Rule[]> {
  return readCollection({
    collection: COLLECTION,
    whereEquals: [{ field: "houseId", value: houseId }],
    orderBy: { field: "createdAt", direction: "desc" },
    mapDoc: docToRule,
  });
}

export async function createRule(input: CreateRuleInput): Promise<Rule> {
  const data: FirestoreRuleDoc = {
    ...input,
    updatedAt: null,
    acknowledgedBy: [],
    deletedAt: null,
    deletedBy: null,
  };
  return addCollectionDoc({ collection: COLLECTION, data, mapDoc: docToRule });
}

export async function updateRule(ruleId: string, input: UpdateRuleInput): Promise<Rule | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: ruleId,
    shouldUpdate: (data) => !data.deletedAt,
    updates: { ...input },
    onGuardFail: "return-null",
    mapDoc: docToRule,
  });
}

export async function acknowledgeRule(ruleId: string, memberName: string): Promise<Rule | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(ruleId);
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
  deletedAt: string
): Promise<Rule | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: ruleId,
    shouldUpdate: (data) => !data.deletedAt,
    updates: { deletedAt, deletedBy },
    onGuardFail: "return-existing",
    mapDoc: docToRule,
  });
}

export const readRules = listRules;
export const appendRule = createRule;
export const deleteRule = updateRuleDeletion;
