import type {
  BalanceAdjustmentRecord,
  CreateBalanceAdjustmentInput,
  FirestoreBalanceAdjustmentDoc,
} from "../types/index.ts";
import { createCollectionDoc, listCollection } from "./store-utils.ts";
import { monthToDateRange } from "./month-range.ts";

const COLLECTION = "balanceAdjustments";

function docToRecord(
  id: string,
  data: FirestoreBalanceAdjustmentDoc
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
  month?: string,
  db?: FirebaseFirestore.Firestore
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
    db,
    collection: COLLECTION,
    where,
    orderBy: [{ field: "adjustedAt", direction: "desc" }],
    mapDoc: docToRecord,
  });
}

export async function createBalanceAdjustment(
  input: CreateBalanceAdjustmentInput,
  db?: FirebaseFirestore.Firestore
): Promise<BalanceAdjustmentRecord> {
  const data: FirestoreBalanceAdjustmentDoc = input;
  return createCollectionDoc({
    db,
    collection: COLLECTION,
    data,
    mapDoc: docToRecord,
  });
}

export const readBalanceAdjustments = listBalanceAdjustments;
export const appendBalanceAdjustment = createBalanceAdjustment;
