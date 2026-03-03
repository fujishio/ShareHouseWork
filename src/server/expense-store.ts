import type { ExpenseRecord, CreateExpenseInput, CancelExpenseInput } from "@/types";
import {
  addCollectionDoc,
  readCollection,
  updateCollectionDocConditionally,
} from "@/server/store-utils";

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
  return readCollection({
    collection: COLLECTION,
    orderBy: { field: "purchasedAt", direction: "desc" },
    mapDoc: docToRecord,
  });
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
