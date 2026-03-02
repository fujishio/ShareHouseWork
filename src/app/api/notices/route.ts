import { NextResponse } from "next/server";
import { readNotices, appendNotice } from "@/server/notice-store";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import type { CreateNoticeInput } from "@/types";
import { z } from "zod";
import {
  zNonEmptyTrimmedString,
  zTrimmedString,
} from "@/shared/lib/api-validation";

const createNoticeSchema = z.object({
  title: zNonEmptyTrimmedString,
  body: zTrimmedString.default(""),
  isImportant: z.boolean().optional().default(false),
});

function badRequest(error: string, code: string, details?: unknown) {
  return NextResponse.json({ error, code, details }, { status: 400 });
}

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
    return badRequest("Invalid JSON", "INVALID_JSON");
  }

  const parsed = createNoticeSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "title") {
      return badRequest("title is required", "VALIDATION_ERROR", parsed.error.issues);
    }
    return badRequest("Invalid body", "VALIDATION_ERROR", parsed.error.issues);
  }

  const postedAt = new Date().toISOString();

  const input: CreateNoticeInput = {
    title: parsed.data.title,
    body: parsed.data.body,
    postedBy: actor.name,
    postedAt,
    isImportant: parsed.data.isImportant,
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
