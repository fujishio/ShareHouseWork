import { getAdminFirestore } from "@/lib/firebase-admin";
import type { AuditLogRecord } from "@/types";

const COLLECTION = "auditLogs";

function docToRecord(id: string, data: FirebaseFirestore.DocumentData): AuditLogRecord {
  return {
    id,
    houseId: data.houseId,
    action: data.action,
    actor: data.actor,
    source: data.source,
    createdAt: data.createdAt,
    details: data.details ?? {},
  };
}

export type ReadAuditLogsOptions = {
  from?: Date;
  to?: Date;
  action?: string;
  limit?: number;
};

export async function readAuditLogs(
  houseId: string,
  options: ReadAuditLogsOptions = {}
): Promise<AuditLogRecord[]> {
  const { from, to, action, limit = 100 } = options;
  const db = getAdminFirestore();

  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
    .collection(COLLECTION)
    .where("houseId", "==", houseId);

  if (action) {
    query = query.where("action", "==", action);
  }
  if (from) {
    query = query.where("createdAt", ">=", from.toISOString());
  }
  if (to) {
    query = query.where("createdAt", "<=", to.toISOString());
  }

  query = query.orderBy("createdAt", "desc").limit(limit);

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => docToRecord(doc.id, doc.data()));
}

export async function appendAuditLog(
  record: Omit<AuditLogRecord, "id">
): Promise<AuditLogRecord> {
  const db = getAdminFirestore();
  const ref = await db.collection(COLLECTION).add(record);
  return docToRecord(ref.id, record);
}
