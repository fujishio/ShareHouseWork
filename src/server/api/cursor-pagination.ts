type DateIdCursorPayload = {
  sortKey: string;
  id: string;
};

export function encodeDateIdCursor(sortKey: string, id: string): string {
  return Buffer.from(JSON.stringify({ sortKey, id } satisfies DateIdCursorPayload), "utf8").toString(
    "base64url"
  );
}

export function decodeDateIdCursor(cursor: string): DateIdCursorPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<DateIdCursorPayload>;
    if (!parsed.sortKey || !parsed.id) return null;
    return { sortKey: parsed.sortKey, id: parsed.id };
  } catch {
    return null;
  }
}

function compareDateIdDesc(aSortKey: string, aId: string, bSortKey: string, bId: string): number {
  if (aSortKey !== bSortKey) {
    return bSortKey.localeCompare(aSortKey);
  }
  return bId.localeCompare(aId);
}

export function paginateByDateIdDesc<T>(options: {
  items: T[];
  getSortKey: (item: T) => string;
  getId: (item: T) => string;
  limit: number;
  cursor?: string;
}): { data: T[]; nextCursor: string | null; isInvalidCursor: boolean } {
  const sorted = [...options.items].sort((a, b) =>
    compareDateIdDesc(
      options.getSortKey(a),
      options.getId(a),
      options.getSortKey(b),
      options.getId(b)
    )
  );

  let startIndex = 0;
  if (options.cursor) {
    const payload = decodeDateIdCursor(options.cursor);
    if (!payload) {
      return { data: [], nextCursor: null, isInvalidCursor: true };
    }
    const cursorIndex = sorted.findIndex(
      (item) => options.getSortKey(item) === payload.sortKey && options.getId(item) === payload.id
    );
    if (cursorIndex < 0) {
      return { data: [], nextCursor: null, isInvalidCursor: true };
    }
    startIndex = cursorIndex + 1;
  }

  const data = sorted.slice(startIndex, startIndex + options.limit);
  const last = data.length > 0 ? data[data.length - 1] : null;
  const nextCursor =
    data.length === options.limit && last
      ? encodeDateIdCursor(options.getSortKey(last), options.getId(last))
      : null;

  return { data, nextCursor, isInvalidCursor: false };
}
