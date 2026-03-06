import { useState } from "react";

export function useExpandableList<T>(items: T[], initialLimit: number = 5) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleItems = isExpanded ? items : items.slice(0, initialLimit);
  const hasMore = items.length > initialLimit;

  return { isExpanded, setIsExpanded, visibleItems, hasMore };
}
