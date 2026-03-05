export type ApiErrorResponse = {
  error: string;
  code?: string;
  details?: unknown;
};

export type ApiSuccessResponse<T> = {
  data: T;
};
