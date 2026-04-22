import { useState, useCallback, useEffect, useRef } from 'react';
import type { ColumnInfo } from '@/types/schema';
import { cn } from '@/lib/cn';

interface SearchBarProps {
  columns: ColumnInfo[];
  onSearch: (search: string, searchColumn: string | undefined) => void;
  debounceMs?: number;
}

export function SearchBar({ columns, onSearch, debounceMs = 300 }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dispatchSearch = useCallback(
    (q: string, col: string) => {
      onSearch(q, col || undefined);
    },
    [onSearch],
  );

  // Debounce the search input
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      dispatchSearch(query, selectedColumn);
    }, debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [query, selectedColumn, debounceMs, dispatchSearch]);

  const handleClear = () => {
    setQuery('');
    setSelectedColumn('');
    dispatchSearch('', '');
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            selectedColumn ? `Search in "${selectedColumn}"...` : 'Search all columns...'
          }
          className={cn(
            'h-9 w-full rounded-md border border-border bg-background px-3 pr-8 text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label="Search"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      <select
        value={selectedColumn}
        onChange={(e) => setSelectedColumn(e.target.value)}
        className={cn(
          'h-9 rounded-md border border-border bg-background px-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-label="Search column"
      >
        <option value="">All columns</option>
        {columns.map((col) => (
          <option key={col.name} value={col.name}>
            {col.name}
          </option>
        ))}
      </select>
    </div>
  );
}
