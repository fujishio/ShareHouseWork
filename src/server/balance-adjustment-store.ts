import type {
  BalanceAdjustmentRecord,
  CreateBalanceAdjustmentInput,
} from "@/types";
import { createCollectionDoc, listCollection } from "@/server/store-utils";
import { monthToDateRange } from "@/server/month-range";

const COLLECTION = "balanceAdjustments";

function docToRecord(
  id: string,
  data: FirebaseFirestore.DocumentData
): BalanceAdjustmentRecord {
  return {
    id,
    houseId: data.houseId,
    amount: data.amount,
    reason: data.reason,
    adjustedBy: data.adjustedBy,
    adjustedAt: data.adjustedAt,
  };
}

export async function listBalanceAdjustments(
  houseId: string,
  month?: string
): Promise<BalanceAdjustmentRecord[]> {
  const where: { field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }[] = [
    { field: "houseId", op: "==", value: houseId },
  ];
  if (month) {
    const range = monthToDateRange(month);
    if (range) {
      where.push(
        { field: "adjustedAt", op: ">=", value: range.from },
        { field: "adjustedAt", op: "<", value: range.to }
      );
    }
  }

  return listCollection({
    collection: COLLECTION,
    where,
    orderBy: [{ field: "adjustedAt", direction: "desc" }],
    mapDoc: docToRecord,
  });
}

export async function createBalanceAdjustment(
  input: CreateBalanceAdjustmentInput
): Promise<BalanceAdjustmentRecord> {
  return createCollectionDoc({
    collection: COLLECTION,
    data: input,
    mapDoc: docToRecord,
  });
}

export const readBalanceAdjustments = listBalanceAdjustments;
export const appendBalanceAdjustment = createBalanceAdjustment;
