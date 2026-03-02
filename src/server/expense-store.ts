import { getAdminFirestore } from "@/lib/firebase-admin";
import type { ExpenseRecord, CreateExpenseInput, CancelExpenseInput } from "@/types";

const COLLECTION = "expenses";

function docToRecord(id: string, data: FirebaseFirestore.DocumentData): ExpenseRecord {
  return {
    id,
    title: data.title,
    amount: data.amount,
    category: data.category,
    purchasedBy: data.purchasedBy,
    purchasedAt: data.purchasedAt,
    canceledAt: data.canceledAt ?? undefined,
    canceledBy: data.canceledBy ?? undefined,
    cancelReason: data.cancelReason ?? undefined,
  };
}

export async function readExpenses(): Promise<ExpenseRecord[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("purchasedAt", "desc")
    .get();
  return snapshot.docs.map((doc) => docToRecord(doc.id, doc.data()));
}

export async function appendExpense(input: CreateExpenseInput): Promise<ExpenseRecord> {
  const db = getAdminFirestore();
  const data = {
    ...input,
    canceledAt: null,
    canceledBy: null,
    cancelReason: null,
  };
  const ref = await db.collection(COLLECTION).add(data);
  return docToRecord(ref.id, data);
}

export async function cancelExpense(
  expenseId: string,
  input: CancelExpenseInput,
  canceledAt: string
): Promise<ExpenseRecord | null> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(expenseId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.canceledAt) return docToRecord(expenseId, data);

  const updated = { canceledAt, canceledBy: input.canceledBy, cancelReason: input.cancelReason };
  await ref.update(updated);
  return docToRecord(expenseId, { ...data, ...updated });
}
