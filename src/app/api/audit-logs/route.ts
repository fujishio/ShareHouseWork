import { NextResponse } from "next/server";
import { readAuditLogs } from "@/server/audit-log-store";
import type { ApiErrorResponse, AuditLogsListResponse } from "@/types";

export const runtime = "nodejs";

function parseLimit(raw: string | null): number {
  if (!raw) {
    return 100;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }
  return Math.min(Math.floor(parsed), 500);
}

function parseDate(raw: string | null): Date | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const action = searchParams.get("action");
  const limit = parseLimit(searchParams.get("limit"));

  if (searchParams.get("from") && !from) {
    return NextResponse.json(
      { error: "Invalid from query. Use ISO date string." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  if (searchParams.get("to") && !to) {
    return NextResponse.json(
      { error: "Invalid to query. Use ISO date string." },
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }

  const logs = await readAuditLogs();
  const filtered = logs
    .filter((log) => {
      const createdAt = new Date(log.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        return false;
      }
      if (action && log.action !== action) {
        return false;
      }
      if (from && createdAt < from) {
        return false;
      }
      if (to && createdAt > to) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return NextResponse.json({ data: filtered }, { status: 200 }) as NextResponse<AuditLogsListResponse>;
}
