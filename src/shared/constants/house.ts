import type { Member } from "@/types";

export const OWNER_MEMBER_NAME = "家主";

export const PRESET_COLORS = [
  "#d97706", // amber
  "#059669", // emerald
  "#2563eb", // blue
  "#db2777", // pink
  "#7c3aed", // violet
  "#57534e", // stone
] as const;

export type PresetColor = (typeof PRESET_COLORS)[number];

export const HOUSE_MEMBERS: Member[] = [
  { id: "1", name: "家主", color: "#d97706" },
  { id: "2", name: "パートナー", color: "#57534e" },
  { id: "3", name: "友達１", color: "#059669" },
  { id: "4", name: "友達２", color: "#db2777" },
];

export const MEMBER_NAMES = HOUSE_MEMBERS.map((m) => m.name);
