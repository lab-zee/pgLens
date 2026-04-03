import { useEffect, useCallback, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useTableData } from '@/hooks/useTableData';
import { CellRenderer } from '@/components/ColumnTypeRenderer';
import { SearchBar } from '@/components/SearchBar';
import type { TableInfo } from '@/types/schema';
import { cn } from '@/lib/cn';

interface DataGridProps {
  connectionId: string;
  table: TableInfo;
}

export function DataGrid({ connectionId, table }: DataGridProps) {
  const { data, isLoading, error, loadData } = useTableData(connectionId);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchColumn, setSearchColumn] = useState<string | undefined>();

  const fetchData = useCallback(() => {
    const sort = sorting[0];
    loadData(table.name, {
      page,
      pageSize: 50,
      sortColumn: sort?.id,
      sortDirection: sort?.desc ? 'desc' : 'asc',
      search: search || undefined,
      searchColumn,
    });
  }, [loadData, table.name, page, sorting, search, searchColumn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = useCallback(
    (q: string, col: string | undefined) => {
      setSearch(q);
      setSearchColumn(col);
      setPage(1);
    },
    [],
  );

  const columns: ColumnDef<Record<string, unknown>>[] = table.columns.map((col) => ({
    accessorKey: col.name,
    header: () => (
      <div className="flex flex-col">
        <span className={cn(col.isPrimaryKey && 'font-bold')}>{col.name}</span>
        <span className="text-[10px] font-normal text-muted-foreground">{col.udtName}</span>
      </div>
    ),
    cell: ({ getValue }) => <CellRenderer value={getValue()} udtName={col.udtName} />,
    enableSorting: true,
  }));

  const reactTable = useReactTable({
    data: data?.rows ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
  });

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SearchBar columns={table.columns} onSearch={handleSearch} />

      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            {reactTable.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-3 py-2 text-left font-medium',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:bg-muted',
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : data?.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  {search ? 'No results found' : 'No data'}
                </td>
              </tr>
            ) : (
              reactTable.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.totalRows.toLocaleString()} {search ? 'results' : 'rows'} — Page {data.page} of{' '}
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
