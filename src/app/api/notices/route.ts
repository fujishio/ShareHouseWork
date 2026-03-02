import { NextResponse } from "next/server";
import { readNotices, appendNotice } from "@/server/notice-store";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type { CreateNoticeInput } from "@/types";

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const notices = await readNotices();
  const active = notices.filter((n) => !n.deletedAt);
  return NextResponse.json({ data: active });
}

export async function POST(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

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

  const postedAt = new Date().toISOString();

  const input: CreateNoticeInput = {
    title,
    body: typeof raw.body === "string" ? raw.body.trim() : "",
    postedBy: actor.name,
    postedAt,
    isImportant: raw.isImportant === true,
  };

  const created = await appendNotice(input);

  await appendAuditLog({
    action: "notice_created",
    actor: actor.name,
    source: "app",
    createdAt: new Date().toISOString(),
    details: { noticeId: created.id, title: created.title, isImportant: created.isImportant },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
