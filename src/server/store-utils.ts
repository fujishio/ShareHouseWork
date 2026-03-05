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

export async function readCollection<T, TDoc extends FirebaseFirestore.DocumentData = FirebaseFirestore.DocumentData>(options: {
  collection: string;
  mapDoc: (id: string, data: TDoc) => T;
  orderBy?: OrderBy;
  whereEquals?: WhereEquals[];
}): Promise<T[]> {
  return listCollection<T, TDoc>({
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

export async function listCollection<T, TDoc extends FirebaseFirestore.DocumentData = FirebaseFirestore.DocumentData>(options: {
  collection: string;
  mapDoc: (id: string, data: TDoc) => T;
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
  return snapshot.docs.map((doc) => options.mapDoc(doc.id, doc.data() as TDoc));
}

export async function addCollectionDoc<T, TDoc extends FirebaseFirestore.DocumentData = FirebaseFirestore.DocumentData>(options: {
  collection: string;
  data: TDoc;
  mapDoc: (id: string, data: TDoc) => T;
}): Promise<T> {
  return createCollectionDoc(options);
}

export async function createCollectionDoc<T, TDoc extends FirebaseFirestore.DocumentData = FirebaseFirestore.DocumentData>(options: {
  collection: string;
  data: TDoc;
  mapDoc: (id: string, data: TDoc) => T;
}): Promise<T> {
  const db = getAdminFirestore();
  const ref = await db.collection(options.collection).add(options.data);
  return options.mapDoc(ref.id, options.data);
}

export async function updateCollectionDocConditionally<T, TDoc extends FirebaseFirestore.DocumentData = FirebaseFirestore.DocumentData>(options: {
  collection: string;
  id: string;
  shouldUpdate: (data: TDoc) => boolean;
  updates:
    | FirebaseFirestore.UpdateData<TDoc>
    | ((data: TDoc) => FirebaseFirestore.UpdateData<TDoc>);
  mapDoc: (id: string, data: TDoc) => T;
  onGuardFail?: "return-null" | "return-existing";
}): Promise<T | null> {
  return updateCollectionDoc(options);
}

export async function updateCollectionDoc<T, TDoc extends FirebaseFirestore.DocumentData = FirebaseFirestore.DocumentData>(options: {
  collection: string;
  id: string;
  shouldUpdate: (data: TDoc) => boolean;
  updates:
    | FirebaseFirestore.UpdateData<TDoc>
    | ((data: TDoc) => FirebaseFirestore.UpdateData<TDoc>);
  mapDoc: (id: string, data: TDoc) => T;
  onGuardFail?: "return-null" | "return-existing";
}): Promise<T | null> {
  const db = getAdminFirestore();
  const ref = db.collection(options.collection).doc(options.id);
  const doc = await ref.get();
  if (!doc.exists) return null;

  const data = doc.data() as TDoc;
  if (!options.shouldUpdate(data)) {
    if (options.onGuardFail === "return-existing") {
      return options.mapDoc(options.id, data);
    }
    return null;
  }

  const updates = typeof options.updates === "function" ? options.updates(data) : options.updates;
  await ref.update(updates);
  return options.mapDoc(options.id, { ...data, ...updates } as TDoc);
}

export async function readCollectionDoc<T, TDoc extends FirebaseFirestore.DocumentData = FirebaseFirestore.DocumentData>(options: {
  collection: string;
  id: string;
  mapDoc: (id: string, data: TDoc) => T;
}): Promise<T | null> {
  const db = getAdminFirestore();
  const doc = await db.collection(options.collection).doc(options.id).get();
  if (!doc.exists) return null;
  return options.mapDoc(doc.id, doc.data() as TDoc);
}
