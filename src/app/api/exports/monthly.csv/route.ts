import { readTaskCompletions } from "@/server/task-completions-store";
import { buildMonthlyOperationsCsv } from "@/server/monthly-export";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function resolveMonth(raw: string | null) {
  if (raw) {
    return raw;
  }
  return new Date().toISOString().slice(0, 7);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = resolveMonth(searchParams.get("month"));

  let csv: string;
  try {
    const records = await readTaskCompletions();
    csv = buildMonthlyOperationsCsv(records, month);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to build monthly csv";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="operations-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
