import type { ExpenseRecord, CreateExpenseInput, CancelExpenseInput } from "@/types";
import {
  createCollectionDoc,
  listCollection,
  updateCollectionDoc,
} from "@/server/store-utils";
import { monthToDateRange } from "@/server/month-range";

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

export async function listExpenses(houseId: string, month?: string): Promise<ExpenseRecord[]> {
  const where: { field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }[] = [
    { field: "houseId", op: "==", value: houseId },
  ];
  if (month) {
    const range = monthToDateRange(month);
    if (range) {
      where.push(
        { field: "purchasedAt", op: ">=", value: range.from },
        { field: "purchasedAt", op: "<", value: range.to }
      );
    }
  }

  return listCollection({
    collection: COLLECTION,
    where,
    orderBy: [{ field: "purchasedAt", direction: "desc" }],
    mapDoc: docToRecord,
  });
}

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseRecord> {
  const data = {
    ...input,
    canceledAt: null,
    canceledBy: null,
    cancelReason: null,
  };
  return createCollectionDoc({ collection: COLLECTION, data, mapDoc: docToRecord });
}

export async function updateExpenseCancellation(
  expenseId: string,
  input: CancelExpenseInput,
  canceledAt: string
): Promise<ExpenseRecord | null> {
  return updateCollectionDoc({
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

export const readExpenses = listExpenses;
export const appendExpense = createExpense;
export const cancelExpense = updateExpenseCancellation;
