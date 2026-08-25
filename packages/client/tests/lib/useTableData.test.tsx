import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTableData } from '@/hooks/useTableData';
import * as api from '@/lib/api';
import type { TableDataPage } from '@/types/schema';

vi.mock('@/lib/api', () => ({
  getTableData: vi.fn(),
}));

const page: TableDataPage = {
  rows: [{ id: 1, name: 'Ada' }],
  totalRows: 1,
  page: 1,
  pageSize: 50,
  totalPages: 1,
};

describe('useTableData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads table data with the selected query options', async () => {
    vi.mocked(api.getTableData).mockResolvedValue(page);
    const { result } = renderHook(() => useTableData('conn-1'));
    const options = {
      page: 2,
      pageSize: 25,
      sortColumn: 'name',
      sortDirection: 'desc' as const,
      search: 'Ada',
      searchColumn: 'name',
    };

    await act(async () => {
      await result.current.loadData('users', options);
    });

    expect(api.getTableData).toHaveBeenCalledWith('conn-1', 'users', options);
    expect(result.current.data).toEqual(page);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('does nothing without a connection ID', async () => {
    const { result } = renderHook(() => useTableData(null));

    await act(async () => {
      await result.current.loadData('users');
    });

    expect(api.getTableData).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('reports API failures and clears the loading state', async () => {
    vi.mocked(api.getTableData).mockRejectedValue(new Error('query timed out'));
    const { result } = renderHook(() => useTableData('conn-1'));

    await act(async () => {
      await result.current.loadData('users');
    });

    expect(result.current.error).toBe('query timed out');
    expect(result.current.isLoading).toBe(false);
  });

  it('uses a safe fallback for non-Error failures', async () => {
    vi.mocked(api.getTableData).mockRejectedValue('offline');
    const { result } = renderHook(() => useTableData('conn-1'));

    await act(async () => {
      await result.current.loadData('users');
    });

    expect(result.current.error).toBe('Failed to load data');
  });

  it('clears previously loaded data and errors', async () => {
    vi.mocked(api.getTableData).mockResolvedValueOnce(page).mockRejectedValueOnce(new Error('bad'));
    const { result } = renderHook(() => useTableData('conn-1'));

    await act(async () => {
      await result.current.loadData('users');
      await result.current.loadData('missing');
    });
    act(() => {
      result.current.clearData();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
