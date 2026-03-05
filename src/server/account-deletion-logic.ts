export type AccountDeletionHouseRecord = {
  id: string;
  ownerUid?: string | null;
  memberUids: string[];
  hostUids: string[];
};

export function partitionHostedHouses(
  uid: string,
  houses: AccountDeletionHouseRecord[]
): {
  hosted: AccountDeletionHouseRecord[];
  memberOnly: AccountDeletionHouseRecord[];
} {
  return houses.reduce(
    (acc, house) => {
      if (house.hostUids.includes(uid)) {
        acc.hosted.push(house);
      } else {
        acc.memberOnly.push(house);
      }
      return acc;
    },
    {
      hosted: [] as AccountDeletionHouseRecord[],
      memberOnly: [] as AccountDeletionHouseRecord[],
    }
  );
}

export function getHouseScopedCollections(): string[] {
  return [
    "taskCompletions",
    "expenses",
    "balanceAdjustments",
    "shoppingItems",
    "rules",
    "notices",
    "auditLogs",
    "tasks",
    "contributionSettings",
    "task_pending_states",
  ];
}

export function buildHouseExitPatch(
  uid: string,
  house: AccountDeletionHouseRecord
): { memberUids: string[]; hostUids: string[]; ownerUid: string | null } {
  const memberUids = house.memberUids.filter((memberUid) => memberUid !== uid);
  const hostUids = house.hostUids.filter((hostUid) => hostUid !== uid);
  const ownerUid = house.ownerUid === uid ? hostUids[0] ?? null : house.ownerUid ?? null;
  return { memberUids, hostUids, ownerUid };
}

export function buildStringFieldAnonymizePatch(
  data: FirebaseFirestore.DocumentData,
  fields: string[],
  targetName: string,
  replacementName: string
): FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> {
  const patch: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {};
  for (const field of fields) {
    if (typeof data[field] === "string" && data[field] === targetName) {
      patch[field] = replacementName;
    }
  }
  return patch;
}

export function replaceNameInStringArray(
  values: unknown,
  targetName: string,
  replacementName: string
): string[] | null {
  if (!Array.isArray(values)) return null;
  const names = values.filter((value): value is string => typeof value === "string");
  if (!names.includes(targetName)) return null;
  return names.map((name) => (name === targetName ? replacementName : name));
}
