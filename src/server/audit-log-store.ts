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

export async function readAuditLogs(houseId: string): Promise<AuditLogRecord[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .where("houseId", "==", houseId)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => docToRecord(doc.id, doc.data()));
}

export async function appendAuditLog(
  record: Omit<AuditLogRecord, "id">
): Promise<AuditLogRecord> {
  const db = getAdminFirestore();
  const ref = await db.collection(COLLECTION).add(record);
  return docToRecord(ref.id, record);
}
