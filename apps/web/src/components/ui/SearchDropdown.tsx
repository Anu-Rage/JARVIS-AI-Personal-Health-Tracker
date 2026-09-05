import type { ReactNode } from "react";

interface SearchDropdownProps<T> {
  items: T[];
  getKey: (item: T) => string;
  onSelect: (item: T) => void;
  renderItem: (item: T) => ReactNode;
  /** Current search text -- enables the "estimate with AI" row when nothing matches. */
  query?: string;
  onEstimate?: (query: string) => void;
  estimating?: boolean;
}

// Floats over whatever's below the search input instead of pushing it down
// the page as results come and go -- a plain inline <ul> made the page
// layout visibly "jump" every time you typed.
export function SearchDropdown<T>({
  items,
  getKey,
  onSelect,
  renderItem,
  query,
  onEstimate,
  estimating,
}: SearchDropdownProps<T>) {
  const trimmedQuery = query?.trim() ?? "";
  const showEstimate = !!onEstimate && items.length === 0 && trimmedQuery.length > 1;
  if (items.length === 0 && !showEstimate) return null;

  return (
    <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
      {items.map((item) => (
        <li key={getKey(item)} className="border-b border-border last:border-b-0">
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-bg"
          >
            {renderItem(item)}
          </button>
        </li>
      ))}
      {showEstimate && (
        <li>
          <button
            type="button"
            onClick={() => onEstimate(trimmedQuery)}
            disabled={estimating}
            className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-bg disabled:opacity-50"
          >
            {estimating ? "Estimating..." : `+ Add "${trimmedQuery}" — estimate with AI`}
          </button>
        </li>
      )}
    </ul>
  );
}
