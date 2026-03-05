import { getAdminFirestore } from "@/lib/firebase-admin";
import type {
  BalanceAdjustmentRecord,
  CreateBalanceAdjustmentInput,
} from "@/types";
import { addCollectionDoc } from "@/server/store-utils";

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

export async function readBalanceAdjustments(
  houseId: string,
  month?: string
): Promise<BalanceAdjustmentRecord[]> {
  const db = getAdminFirestore();
  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
    .collection(COLLECTION)
    .where("houseId", "==", houseId);

  if (month) {
    const range = monthToDateRange(month);
    if (range) {
      query = query
        .where("adjustedAt", ">=", range.from)
        .where("adjustedAt", "<", range.to);
    }
  }

  query = query.orderBy("adjustedAt", "desc");
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => docToRecord(doc.id, doc.data()));
}

export async function appendBalanceAdjustment(
  input: CreateBalanceAdjustmentInput
): Promise<BalanceAdjustmentRecord> {
  return addCollectionDoc({
    collection: COLLECTION,
    data: input,
    mapDoc: docToRecord,
  });
}
