import { getAdminFirestore } from "@/lib/firebase-admin";

type OrderBy = {
  field: string | FirebaseFirestore.FieldPath;
  direction?: FirebaseFirestore.OrderByDirection;
};

type WhereEquals = {
  field: string | FirebaseFirestore.FieldPath;
  value: unknown;
};

type WhereClause = {
  field: string | FirebaseFirestore.FieldPath;
  op: FirebaseFirestore.WhereFilterOp;
  value: unknown;
};

export async function readCollection<T>(options: {
  collection: string;
  mapDoc: (id: string, data: FirebaseFirestore.DocumentData) => T;
  orderBy?: OrderBy;
  whereEquals?: WhereEquals[];
}): Promise<T[]> {
  return listCollection({
    collection: options.collection,
    mapDoc: options.mapDoc,
    orderBy: options.orderBy ? [options.orderBy] : [],
    where: (options.whereEquals ?? []).map((clause) => ({
      field: clause.field,
      op: "==",
      value: clause.value,
    })),
  });
}

export async function listCollection<T>(options: {
  collection: string;
  mapDoc: (id: string, data: FirebaseFirestore.DocumentData) => T;
  where?: WhereClause[];
  orderBy?: OrderBy[];
  limit?: number;
  startAfter?: unknown[];
}): Promise<T[]> {
  const db = getAdminFirestore();

  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection(
    options.collection
  );

  for (const clause of options.where ?? []) {
    query = query.where(clause.field, clause.op, clause.value);
  }

  for (const order of options.orderBy ?? []) {
    query = query.orderBy(order.field, order.direction);
  }

  if (options.startAfter && options.startAfter.length > 0) {
    query = query.startAfter(...options.startAfter);
  }

  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => options.mapDoc(doc.id, doc.data()));
}

export async function addCollectionDoc<T>(options: {
  collection: string;
  data: FirebaseFirestore.DocumentData;
  mapDoc: (id: string, data: FirebaseFirestore.DocumentData) => T;
}): Promise<T> {
  return createCollectionDoc(options);
}

export async function createCollectionDoc<T>(options: {
  collection: string;
  data: FirebaseFirestore.DocumentData;
  mapDoc: (id: string, data: FirebaseFirestore.DocumentData) => T;
}): Promise<T> {
  const db = getAdminFirestore();
  const ref = await db.collection(options.collection).add(options.data);
  return options.mapDoc(ref.id, options.data);
}

export async function updateCollectionDocConditionally<T>(options: {
  collection: string;
  id: string;
  shouldUpdate: (data: FirebaseFirestore.DocumentData) => boolean;
  updates:
    | FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>
    | ((data: FirebaseFirestore.DocumentData) => FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
  mapDoc: (id: string, data: FirebaseFirestore.DocumentData) => T;
  onGuardFail?: "return-null" | "return-existing";
}): Promise<T | null> {
  return updateCollectionDoc(options);
}

export async function updateCollectionDoc<T>(options: {
  collection: string;
  id: string;
  shouldUpdate: (data: FirebaseFirestore.DocumentData) => boolean;
  updates:
    | FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>
    | ((data: FirebaseFirestore.DocumentData) => FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
  mapDoc: (id: string, data: FirebaseFirestore.DocumentData) => T;
  onGuardFail?: "return-null" | "return-existing";
}): Promise<T | null> {
  const db = getAdminFirestore();
  const ref = db.collection(options.collection).doc(options.id);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (!options.shouldUpdate(data)) {
    if (options.onGuardFail === "return-existing") {
      return options.mapDoc(options.id, data);
    }
    return null;
  }

  const updates = typeof options.updates === "function" ? options.updates(data) : options.updates;
  await ref.update(updates);
  return options.mapDoc(options.id, { ...data, ...updates });
}

export async function readCollectionDoc<T>(options: {
  collection: string;
  id: string;
  mapDoc: (id: string, data: FirebaseFirestore.DocumentData) => T;
}): Promise<T | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(options.collection).doc(options.id).get();
  if (!doc.exists) return null;
  return options.mapDoc(doc.id, doc.data()!);
}
