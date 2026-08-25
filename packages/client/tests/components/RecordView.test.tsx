import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecordView } from '@/components/RecordView';
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

vi.mock('@/components/RecordCard', () => ({
  RecordCard: ({ row }: { row: Record<string, unknown> }) => <div>record {String(row.name)}</div>,
}));

const table: TableInfo = {
  name: 'users',
  schema: 'public',
  rowCount: 21,
  columns: [],
  primaryKeys: [],
  foreignKeys: [],
  indexes: [],
};

const data: TableDataPage = {
  rows: [{ id: 1, name: 'Ada' }],
  totalRows: 21,
  page: 1,
  pageSize: 10,
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

describe('RecordView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads records and updates server queries for pagination and search', async () => {
    const user = userEvent.setup();
    const state = hookState();
    vi.mocked(useTableData).mockReturnValue(state);

    render(<RecordView connectionId="conn-1" table={table} />);

    await waitFor(() =>
      expect(state.loadData).toHaveBeenCalledWith('users', {
        page: 1,
        pageSize: 10,
        search: undefined,
        searchColumn: undefined,
      }),
    );
    expect(screen.getByText('record Ada')).toBeInTheDocument();
    expect(screen.getByText(/21 records — Page 1 of 3/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(state.loadData).toHaveBeenCalledWith('users', expect.objectContaining({ page: 2 })),
    );

    await user.click(screen.getByRole('button', { name: 'mock search' }));
    await waitFor(() =>
      expect(state.loadData).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({ page: 1, search: 'Ada', searchColumn: 'name' }),
      ),
    );
    expect(screen.getByText(/21 results/)).toBeInTheDocument();
  });

  it('renders error, loading, and empty states', () => {
    vi.mocked(useTableData).mockReturnValue(hookState({ error: 'query failed' }));
    const { rerender } = render(<RecordView connectionId="conn-1" table={table} />);
    expect(screen.getByText('query failed')).toBeInTheDocument();

    vi.mocked(useTableData).mockReturnValue(hookState({ data: null, isLoading: true }));
    rerender(<RecordView connectionId="conn-1" table={table} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    vi.mocked(useTableData).mockReturnValue(
      hookState({ data: { ...data, rows: [], totalRows: 0, totalPages: 0 } }),
    );
    rerender(<RecordView connectionId="conn-1" table={table} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
});
