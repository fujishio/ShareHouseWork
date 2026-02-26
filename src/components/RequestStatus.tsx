type LoadingNoticeProps = {
  message?: string;
};

type ErrorNoticeProps = {
  message: string;
};

export function LoadingNotice({ message = "処理中..." }: LoadingNoticeProps) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
      {message}
    </div>
  );
}

export function ErrorNotice({ message }: ErrorNoticeProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
      {message}
    </div>
  );
}
