import type { AuditLogRecord, FirestoreAuditLogDoc } from "../types/index.ts";
import { createCollectionDoc, listCollection } from "./store-utils.ts";
import { FieldPath } from "firebase-admin/firestore";

const COLLECTION = "auditLogs";

function docToRecord(id: string, data: FirestoreAuditLogDoc): AuditLogRecord {
  return {
    id,
    houseId: data.houseId,
    action: data.action,
    actor: data.actor,
    actorUid: data.actorUid,
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
  cursor?: string;
};

type AuditLogCursorPayload = {
  createdAt: string;
  id: string;
};

function encodeCursor(payload: AuditLogCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): AuditLogCursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<AuditLogCursorPayload>;
    if (!parsed.createdAt || !parsed.id) return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

export async function listAuditLogs(
  houseId: string,
  options: ReadAuditLogsOptions = {},
  db?: FirebaseFirestore.Firestore
): Promise<AuditLogRecord[]> {
  const { from, to, action, limit = 100, cursor } = options;
  const where: { field: string; op: FirebaseFirestore.WhereFilterOp; value: unknown }[] = [
    { field: "houseId", op: "==", value: houseId },
  ];

  if (action) {
    where.push({ field: "action", op: "==", value: action });
  }
  if (from) {
    where.push({ field: "createdAt", op: ">=", value: from.toISOString() });
  }
  if (to) {
    where.push({ field: "createdAt", op: "<=", value: to.toISOString() });
  }

  const cursorPayload = cursor ? decodeCursor(cursor) : null;

  return listCollection({
    db,
    collection: COLLECTION,
    where,
    orderBy: [
      { field: "createdAt", direction: "desc" },
      { field: FieldPath.documentId(), direction: "desc" },
    ],
    startAfter: cursorPayload ? [cursorPayload.createdAt, cursorPayload.id] : undefined,
    limit,
    mapDoc: docToRecord,
  });
}

export async function createAuditLog(
  record: Omit<AuditLogRecord, "id">,
  db?: FirebaseFirestore.Firestore
): Promise<AuditLogRecord> {
  const data: FirestoreAuditLogDoc = {
    ...record,
    details: record.details ?? {},
  };
  return createCollectionDoc({
    db,
    collection: COLLECTION,
    data,
    mapDoc: docToRecord,
  });
}

export const readAuditLogs = listAuditLogs;
export const appendAuditLog = createAuditLog;

export function createAuditLogCursor(record: Pick<AuditLogRecord, "id" | "createdAt">): string {
  return encodeCursor({ id: record.id, createdAt: record.createdAt });
}
