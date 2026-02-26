import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Rule, CreateRuleInput, UpdateRuleInput } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "rules.json");

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, "[]\n", "utf-8");
  }
}

export async function readRules(): Promise<Rule[]> {
  await ensureDataFile();
  const raw = await readFile(DATA_FILE, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as Rule[];
}

async function writeRules(rules: Rule[]) {
  await ensureDataFile();
  await writeFile(DATA_FILE, `${JSON.stringify(rules, null, 2)}\n`, "utf-8");
}

export async function appendRule(input: CreateRuleInput): Promise<Rule> {
  const rules = await readRules();
  const nextId = rules.reduce((max, r) => Math.max(max, r.id), 0) + 1;

  const created: Rule = {
    id: nextId,
    ...input,
  };

  await writeRules([...rules, created]);
  return created;
}

export async function updateRule(
  ruleId: number,
  input: UpdateRuleInput
): Promise<Rule | null> {
  const rules = await readRules();
  const index = rules.findIndex((r) => r.id === ruleId);
  if (index === -1) return null;

  const target = rules[index];
  if (target.deletedAt) return null;

  const updated: Rule = {
    ...target,
    title: input.title,
    body: input.body,
    category: input.category,
    updatedAt: input.updatedAt,
  };
  rules[index] = updated;
  await writeRules(rules);
  return updated;
}

export async function acknowledgeRule(
  ruleId: number,
  memberName: string
): Promise<Rule | null> {
  const rules = await readRules();
  const index = rules.findIndex((r) => r.id === ruleId);
  if (index === -1) return null;

  const target = rules[index];
  if (target.deletedAt) return null;

  const current = target.acknowledgedBy ?? [];
  if (current.includes(memberName)) return target;

  const updated: Rule = {
    ...target,
    acknowledgedBy: [...current, memberName],
  };
  rules[index] = updated;
  await writeRules(rules);
  return updated;
}

export async function deleteRule(
  ruleId: number,
  deletedBy: string,
  deletedAt: string
): Promise<Rule | null> {
  const rules = await readRules();
  const index = rules.findIndex((r) => r.id === ruleId);
  if (index === -1) return null;

  const target = rules[index];
  if (target.deletedAt) return target;

  const updated: Rule = { ...target, deletedAt, deletedBy };
  rules[index] = updated;
  await writeRules(rules);
  return updated;
}
