import type { Rule, CreateRuleInput, UpdateRuleInput } from "@/types";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "@/server/store-utils";

const COLLECTION = "rules";

function docToRule(id: string, data: FirebaseFirestore.DocumentData): Rule {
  return {
    id,
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

export async function readRules(): Promise<Rule[]> {
  return readCollection({
    collection: COLLECTION,
    orderBy: { field: "createdAt", direction: "desc" },
    mapDoc: docToRule,
  });
}

export async function appendRule(input: CreateRuleInput): Promise<Rule> {
  const data = {
    ...input,
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
  if (!doc.exists || doc.data()?.deletedAt) return null;

  const current: string[] = doc.data()?.acknowledgedBy ?? [];
  if (current.includes(memberName)) return docToRule(ruleId, doc.data()!);

  const acknowledgedBy = [...current, memberName];
  await ref.update({ acknowledgedBy });
  return docToRule(ruleId, { ...doc.data(), acknowledgedBy });
}

export async function deleteRule(
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
