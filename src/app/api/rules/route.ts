import { NextResponse } from "next/server";
import { readRules, appendRule } from "@/server/rule-store";
import type { CreateRuleInput, RuleCategory } from "@/types";

const VALID_CATEGORIES: RuleCategory[] = [
  "ゴミ捨て",
  "騒音",
  "共用部",
  "来客",
  "その他",
];

export async function GET() {
  const rules = await readRules();
  const active = rules.filter((r) => !r.deletedAt);
  return NextResponse.json({ data: active });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const body_ = typeof raw.body === "string" ? raw.body.trim() : "";

  const category = raw.category as RuleCategory;
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: "Invalid category" },
      { status: 400 }
    );
  }

  const createdBy =
    typeof raw.createdBy === "string" ? raw.createdBy.trim() : "";
  if (!createdBy) {
    return NextResponse.json(
      { error: "createdBy is required" },
      { status: 400 }
    );
  }

  const createdAt =
    typeof raw.createdAt === "string"
      ? raw.createdAt
      : new Date().toISOString();

  const input: CreateRuleInput = {
    title,
    body: body_,
    category,
    createdBy,
    createdAt,
  };

  const created = await appendRule(input);
  return NextResponse.json({ data: created }, { status: 201 });
}
