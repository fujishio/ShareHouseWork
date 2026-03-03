import { getAdminFirestore } from "@/lib/firebase-admin";

type OrderBy = {
  field: string;
  direction?: FirebaseFirestore.OrderByDirection;
};

type WhereEquals = {
  field: string;
  value: unknown;
};

export async function readCollection<T>(options: {
  collection: string;
  mapDoc: (id: string, data: FirebaseFirestore.DocumentData) => T;
  orderBy?: OrderBy;
  whereEquals?: WhereEquals[];
}): Promise<T[]> {
  const db = getAdminFirestore();

  let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection(
    options.collection
  );

  for (const clause of options.whereEquals ?? []) {
    query = query.where(clause.field, "==", clause.value);
  }

  if (options.orderBy) {
    query = query.orderBy(options.orderBy.field, options.orderBy.direction);
  }

  const snapshot = await query.get();
  return snapshot.docs.map((doc) => options.mapDoc(doc.id, doc.data()));
}

export async function addCollectionDoc<T>(options: {
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
