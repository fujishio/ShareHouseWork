type DocData = Record<string, unknown>;

export type FakeFirestoreSeed = Record<string, Record<string, DocData>>;

export type FakeFirestoreCallLog = {
  where: Array<{ collection: string; field: unknown; op: unknown; value: unknown }>;
  orderBy: Array<{ collection: string; field: unknown; direction: unknown }>;
  startAfter: Array<{ collection: string; values: unknown[] }>;
  limit: Array<{ collection: string; value: number }>;
  add: Array<{ collection: string; data: DocData }>;
  update: Array<{ collection: string; id: string; updates: DocData }>;
  set: Array<{ collection: string; id: string; data: DocData; merge: boolean }>;
  delete: Array<{ collection: string; id: string }>;
};

export function createFakeFirestoreDb(initialSeed: FakeFirestoreSeed) {
  const seed: FakeFirestoreSeed = JSON.parse(JSON.stringify(initialSeed));
  const calls: FakeFirestoreCallLog = {
    where: [],
    orderBy: [],
    startAfter: [],
    limit: [],
    add: [],
    update: [],
    set: [],
    delete: [],
  };

  let idSeq = 0;

  function nextId() {
    idSeq += 1;
    return `new-${idSeq}`;
  }

  function applySet(collectionName: string, id: string, data: DocData, merge: boolean) {
    if (!seed[collectionName]) seed[collectionName] = {};
    const current = seed[collectionName][id] ?? {};
    seed[collectionName][id] = merge ? { ...current, ...data } : { ...data };
    calls.set.push({ collection: collectionName, id, data, merge });
  }

  function docRef(collectionName: string, id: string) {
    return {
      id,
      async get() {
        const data = seed[collectionName]?.[id];
        return { id, exists: data !== undefined, data: () => data };
      },
      async update(updates: DocData) {
        if (!seed[collectionName]) seed[collectionName] = {};
        const current = seed[collectionName][id] ?? {};
        seed[collectionName][id] = { ...current, ...updates };
        calls.update.push({ collection: collectionName, id, updates });
      },
      async set(data: DocData, options?: { merge?: boolean }) {
        applySet(collectionName, id, data, options?.merge === true);
      },
      async delete() {
        if (seed[collectionName]) {
          const { [id]: _removed, ...rest } = seed[collectionName]!;
          seed[collectionName] = rest;
        }
        calls.delete.push({ collection: collectionName, id });
      },
    };
  }

  function collection(name: string) {
    let appliedLimit: number | undefined;

    const query = {
      where(field: unknown, op: unknown, value: unknown) {
        calls.where.push({ collection: name, field, op, value });
        return query;
      },
      orderBy(field: unknown, direction?: unknown) {
        calls.orderBy.push({ collection: name, field, direction });
        return query;
      },
      startAfter(...values: unknown[]) {
        calls.startAfter.push({ collection: name, values });
        return query;
      },
      limit(value: number) {
        appliedLimit = value;
        calls.limit.push({ collection: name, value });
        return query;
      },
      async get() {
        const entries = Object.entries(seed[name] ?? {});
        const sliced = appliedLimit === undefined ? entries : entries.slice(0, appliedLimit);
        return {
          docs: sliced.map(([id, data]) => ({ id, data: () => data })),
          empty: sliced.length === 0,
        };
      },
      async add(data: DocData) {
        const id = nextId();
        if (!seed[name]) seed[name] = {};
        seed[name][id] = data;
        calls.add.push({ collection: name, data });
        return { id };
      },
      doc(id?: string) {
        return docRef(name, id ?? nextId());
      },
    };

    return query;
  }

  return {
    db: {
      collection,
      batch() {
        const ops: Array<() => Promise<void>> = [];
        return {
          set(ref: { id: string; set: (data: DocData, options?: { merge?: boolean }) => Promise<void> }, data: DocData, options?: { merge?: boolean }) {
            ops.push(() => {
              return ref.set(data, options);
            });
          },
          async commit() {
            for (const op of ops) await op();
          },
        };
      },
    } as unknown as FirebaseFirestore.Firestore,
    calls,
    seed,
  };
}
