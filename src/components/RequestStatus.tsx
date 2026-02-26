import Loading from "./Loading";

type LoadingNoticeProps = {
  message?: string;
};

type ErrorNoticeProps = {
  message: string;
};

type RetryNoticeProps = {
  message: string;
  actionLabel?: string;
  onRetry: () => void;
  disabled?: boolean;
};

export function LoadingNotice({ message = "処理中..." }: LoadingNoticeProps) {
  return <Loading message={message} compact />;
}

export function ErrorNotice({ message }: ErrorNoticeProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
      {message}
    </div>
  );
}

export function RetryNotice({
  message,
  actionLabel = "再試行",
  onRetry,
  disabled = false,
}: RetryNoticeProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
      <p className="text-xs font-medium text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="mt-2 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {actionLabel}
      </button>
    </div>
  );
}
