import { useCallback, useState } from "react";
import { submitApiAction } from "@/shared/lib/submit-api-action";

type SubmitOptions = {
  request: () => Promise<Response>;
  successMessage: string;
  fallbackErrorMessage: string;
  onSuccess?: (response: Response) => Promise<void> | void;
};

export function useFormSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async (options: SubmitOptions) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      return await submitApiAction({
        ...options,
        onError: (message) => setErrorMessage(message),
      });
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, errorMessage, handleSubmit };
}
