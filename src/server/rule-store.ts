import { getAdminFirestore } from "@/lib/firebase-admin";
import type { Rule, CreateRuleInput, UpdateRuleInput } from "@/types";

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
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => docToRule(doc.id, doc.data()));
}

export async function appendRule(input: CreateRuleInput): Promise<Rule> {
  const db = getAdminFirestore();
  const data = {
    ...input,
    acknowledgedBy: [],
    deletedAt: null,
    deletedBy: null,
  };
  const ref = await db.collection(COLLECTION).add(data);
  return docToRule(ref.id, data);
}

export async function updateRule(ruleId: string, input: UpdateRuleInput): Promise<Rule | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(ruleId);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.deletedAt) return null;

  await ref.update({ ...input });
  return docToRule(ruleId, { ...doc.data(), ...input });
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
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(ruleId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.deletedAt) return docToRule(ruleId, data);

  const updated = { deletedAt, deletedBy };
  await ref.update(updated);
  return docToRule(ruleId, { ...data, ...updated });
}
