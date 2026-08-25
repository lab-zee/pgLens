import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataGrid } from '@/components/DataGrid';
import { useTableData } from '@/hooks/useTableData';
import type { ColumnInfo, TableDataPage, TableInfo } from '@/types/schema';

vi.mock('@/hooks/useTableData', () => ({
  useTableData: vi.fn(),
}));

vi.mock('@/components/SearchBar', () => ({
  SearchBar: ({
    onSearch,
  }: {
    columns: ColumnInfo[];
    onSearch: (query: string, column: string | undefined) => void;
  }) => <button onClick={() => onSearch('Ada', 'name')}>mock search</button>,
}));

const table: TableInfo = {
  name: 'users',
  schema: 'public',
  rowCount: 1234,
  columns: [
    {
      name: 'id',
      dataType: 'integer',
      udtName: 'int8',
      isNullable: false,
      columnDefault: null,
      isPrimaryKey: true,
      characterMaxLength: null,
      numericPrecision: 64,
    },
    {
      name: 'name',
      dataType: 'text',
      udtName: 'text',
      isNullable: false,
      columnDefault: null,
      isPrimaryKey: false,
      characterMaxLength: null,
      numericPrecision: null,
    },
  ],
  primaryKeys: ['id'],
  foreignKeys: [],
  indexes: [],
};

const data: TableDataPage = {
  rows: [{ id: 1, name: 'Ada' }],
  totalRows: 1234,
  page: 1,
  pageSize: 50,
  totalPages: 3,
};

function hookState(overrides: Partial<ReturnType<typeof useTableData>> = {}) {
  return {
    data,
    isLoading: false,
    error: null,
    loadData: vi.fn().mockResolvedValue(undefined),
    clearData: vi.fn(),
    ...overrides,
  };
}

describe('DataGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads, renders, sorts, searches, and paginates server-side data', async () => {
    const user = userEvent.setup();
    const state = hookState();
    vi.mocked(useTableData).mockReturnValue(state);

    render(<DataGrid connectionId="conn-1" table={table} />);

    await waitFor(() =>
      expect(state.loadData).toHaveBeenCalledWith('users', {
        page: 1,
        pageSize: 50,
        sortColumn: undefined,
        sortDirection: 'asc',
        search: undefined,
        searchColumn: undefined,
      }),
    );
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText(/1,234 rows — Page 1 of 3/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(state.loadData).toHaveBeenCalledWith('users', expect.objectContaining({ page: 2 })),
    );

    await user.click(screen.getByText('name'));
    await waitFor(() =>
      expect(state.loadData).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({ sortColumn: 'name', sortDirection: 'asc' }),
      ),
    );

    await user.click(screen.getByRole('button', { name: 'mock search' }));
    await waitFor(() =>
      expect(state.loadData).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({ page: 1, search: 'Ada', searchColumn: 'name' }),
      ),
    );
  });

  it('renders error, loading, and empty-result states', () => {
    vi.mocked(useTableData).mockReturnValue(hookState({ error: 'query failed' }));
    const { rerender } = render(<DataGrid connectionId="conn-1" table={table} />);
    expect(screen.getByText('query failed')).toBeInTheDocument();

    vi.mocked(useTableData).mockReturnValue(hookState({ data: null, isLoading: true }));
    rerender(<DataGrid connectionId="conn-1" table={table} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    vi.mocked(useTableData).mockReturnValue(
      hookState({ data: { ...data, rows: [], totalRows: 0, totalPages: 0 } }),
    );
    rerender(<DataGrid connectionId="conn-1" table={table} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});
