import { useCallback, useState } from "react";

export function useItemAction() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const execute = useCallback(async (id: string, action: () => Promise<void>) => {
    setActiveId(id);
    try {
      await action();
    } finally {
      setActiveId(null);
    }
  }, []);

  return { activeId, execute };
}
