import { NextResponse } from "next/server";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/types";

export function successJson<T>(
  data: T,
  init?: ResponseInit
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json<ApiSuccessResponse<T>>({ data }, init);
}

export function errorJson(
  error: string,
  code: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json<ApiErrorResponse>(
    { error, code, details },
    { status }
  );
}
