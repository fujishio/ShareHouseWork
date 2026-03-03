import { getApiErrorMessage } from "@/shared/lib/api-error";
import { showToast } from "@/shared/lib/toast";

type SubmitApiActionOptions = {
  request: () => Promise<Response>;
  successMessage: string;
  fallbackErrorMessage: string;
  networkErrorMessage?: string;
  onSuccess?: () => Promise<void> | void;
  onError?: (message: string) => void;
};

export async function submitApiAction(options: SubmitApiActionOptions): Promise<boolean> {
  const {
    request,
    successMessage,
    fallbackErrorMessage,
    networkErrorMessage = "通信エラーが発生しました",
    onSuccess,
    onError,
  } = options;

  try {
    const response = await request();
    if (!response.ok) {
      const message = await getApiErrorMessage(response, fallbackErrorMessage);
      onError?.(message);
      showToast({ level: "error", message });
      return false;
    }

    await onSuccess?.();
    showToast({ level: "success", message: successMessage });
    return true;
  } catch {
    onError?.(networkErrorMessage);
    showToast({ level: "error", message: networkErrorMessage });
    return false;
  }
}
