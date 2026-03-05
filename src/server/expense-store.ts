import { getAdminFirestore } from "@/lib/firebase-admin";
import type { ExpenseRecord, CreateExpenseInput, CancelExpenseInput } from "@/types";
import {
  addCollectionDoc,
  updateCollectionDocConditionally,
} from "@/server/store-utils";

const COLLECTION = "expenses";

function docToRecord(id: string, data: FirebaseFirestore.DocumentData): ExpenseRecord {
  return {
    id,
    houseId: data.houseId,
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

function monthToDateRange(month: string): { from: string; to: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = parseInt(match[1]!, 10);
  const mon = parseInt(match[2]!, 10);
  if (mon < 1 || mon > 12) return null;
  const from = `${String(year).padStart(4, "0")}-${String(mon).padStart(2, "0")}-01`;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const nextYear = mon === 12 ? year + 1 : year;
  const to = `${String(nextYear).padStart(4, "0")}-${String(nextMon).padStart(2, "0")}-01`;
  return { from, to };
}

export async function readExpenses(houseId: string, month?: string): Promise<ExpenseRecord[]> {
  const db = getAdminFirestore();
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
    .collection(COLLECTION)
    .where("houseId", "==", houseId);

  if (month) {
    const range = monthToDateRange(month);
    if (range) {
      query = query
        .where("purchasedAt", ">=", range.from)
        .where("purchasedAt", "<", range.to);
    }
  }

  query = query.orderBy("purchasedAt", "desc");
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => docToRecord(doc.id, doc.data()));
}

export async function appendExpense(input: CreateExpenseInput): Promise<ExpenseRecord> {
  const data = {
    ...input,
    canceledAt: null,
    canceledBy: null,
    cancelReason: null,
  };
  return addCollectionDoc({ collection: COLLECTION, data, mapDoc: docToRecord });
}

export async function cancelExpense(
  expenseId: string,
  input: CancelExpenseInput,
  canceledAt: string
): Promise<ExpenseRecord | null> {
  return updateCollectionDocConditionally({
    collection: COLLECTION,
    id: expenseId,
    shouldUpdate: (data) => !data.canceledAt,
    updates: {
      canceledAt,
      canceledBy: input.canceledBy,
      cancelReason: input.cancelReason,
    },
    onGuardFail: "return-existing",
    mapDoc: docToRecord,
  });
}
