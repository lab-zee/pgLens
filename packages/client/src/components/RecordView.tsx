import { useEffect, useCallback, useState } from 'react';
import { useTableData } from '@/hooks/useTableData';
import { RecordCard } from '@/components/RecordCard';
import { SearchBar } from '@/components/SearchBar';
import type { TableInfo } from '@/types/schema';

interface RecordViewProps {
  connectionId: string;
  table: TableInfo;
}

export function RecordView({ connectionId, table }: RecordViewProps) {
  const { data, isLoading, error, loadData } = useTableData(connectionId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState<string | undefined>();

  const fetchData = useCallback(() => {
    loadData(table.name, {
      page,
      pageSize: 10,
      search: search || undefined,
      searchColumn,
    });
  }, [loadData, table.name, page, search, searchColumn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback((q: string, col: string | undefined) => {
    setSearch(q);
    setSearchColumn(col);
    setPage(1);
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar columns={table.columns} onSearch={handleSearch} />

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : !data || data.rows.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {search ? 'No results found' : 'No data'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.rows.map((row, i) => (
            <RecordCard key={`${page}-${i}`} row={row} columns={table.columns} table={table} />
          ))}
        </div>
      )}

      {data && data.totalPages > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.totalRows.toLocaleString()} {search ? 'results' : 'records'} — Page {data.page} of{' '}
            {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border px-3 py-1 hover:bg-muted disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="rounded border px-3 py-1 hover:bg-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
