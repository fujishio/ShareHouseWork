import type { Member } from "@/types";

export const OWNER_MEMBER_NAME = "家主";

export const HOUSE_MEMBERS: Member[] = [
  { id: 1, name: "家主", color: "#d97706" },
  { id: 2, name: "パートナー", color: "#57534e" },
  { id: 3, name: "友達１", color: "#059669" },
  { id: 4, name: "友達２", color: "#db2777" },
];

export const MEMBER_NAMES = HOUSE_MEMBERS.map((m) => m.name);

export function isValidMemberName(name: string): boolean {
  return MEMBER_NAMES.includes(name);
}

// Placeholder until NextAuth is implemented
export const CURRENT_USER_ID = 1;

// Placeholder until NextAuth is implemented — will be replaced by useSession().user.name
export const CURRENT_ACTOR = "あなた";
