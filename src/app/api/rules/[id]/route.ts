import { NextResponse } from "next/server";
import { updateRule, deleteRule, acknowledgeRule } from "@/server/rule-store";
import type { RuleCategory, UpdateRuleInput } from "@/types";

const VALID_MEMBERS = ["家主", "パートナー", "友達１", "友達２"];

const VALID_CATEGORIES: RuleCategory[] = [
  "ゴミ捨て",
  "騒音",
  "共用部",
  "来客",
  "その他",
];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ruleId = Number(id);
  if (!Number.isInteger(ruleId) || ruleId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

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

  const category = raw.category as RuleCategory;
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: "Invalid category" },
      { status: 400 }
    );
  }

  const input: UpdateRuleInput = {
    title,
    body: typeof raw.body === "string" ? raw.body.trim() : "",
    category,
    updatedAt: new Date().toISOString(),
  };

  const updated = await updateRule(ruleId, input);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ruleId = Number(id);
  if (!Number.isInteger(ruleId) || ruleId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

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
  const memberName =
    typeof raw.acknowledgedBy === "string" ? raw.acknowledgedBy.trim() : "";

  if (!memberName || !VALID_MEMBERS.includes(memberName)) {
    return NextResponse.json(
      { error: "Invalid member name" },
      { status: 400 }
    );
  }

  const updated = await acknowledgeRule(ruleId, memberName);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ruleId = Number(id);
  if (!Number.isInteger(ruleId) || ruleId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const raw = (body ?? {}) as Record<string, unknown>;
  const deletedBy =
    typeof raw.deletedBy === "string" && raw.deletedBy.trim()
      ? raw.deletedBy.trim()
      : "不明";

  const deletedAt = new Date().toISOString();
  const updated = await deleteRule(ruleId, deletedBy, deletedAt);

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
