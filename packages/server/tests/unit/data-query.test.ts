import { describe, it, expect, vi } from 'vitest';
import { queryTableData } from '../../src/services/data-query.js';
import type { DatabaseAdapter } from '../../src/services/database-adapter.js';

function createMockAdapter(
  queryResult: {
    rows: Record<string, unknown>[];
    totalRows: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  } = {
    rows: [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ],
    totalRows: 100,
  },
): DatabaseAdapter {
  const result = {
    rows: queryResult.rows,
    totalRows: queryResult.totalRows,
    page: queryResult.page ?? 1,
    pageSize: queryResult.pageSize ?? 50,
    totalPages:
      queryResult.totalPages ?? Math.ceil(queryResult.totalRows / (queryResult.pageSize ?? 50)),
  };

  return {
    dialect: 'postgres',
    supportsSchemas: true,
    getTables: vi.fn().mockResolvedValue([]),
    getColumns: vi.fn().mockResolvedValue([]),
    getForeignKeys: vi.fn().mockResolvedValue([]),
    getIndexes: vi.fn().mockResolvedValue([]),
    getRowCount: vi.fn().mockResolvedValue(0),
    tableExists: vi.fn().mockResolvedValue(true),
    queryTableData: vi.fn().mockResolvedValue(result),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('DataQuery', () => {
  describe('queryTableData', () => {
    it('should delegate to adapter.queryTableData', async () => {
      const adapter = createMockAdapter();
      const result = await queryTableData(adapter, 'public', 'users');
      expect(adapter.queryTableData).toHaveBeenCalledWith('public', 'users', {});
      expect(result.rows).toHaveLength(2);
      expect(result.totalRows).toBe(100);
    });

    it('should pass options through to the adapter', async () => {
      const adapter = createMockAdapter();
      await queryTableData(adapter, 'public', 'users', {
        page: 3,
        pageSize: 25,
        sortColumn: 'name',
        sortDirection: 'desc',
        search: 'alice',
        searchColumn: 'name',
      });
      expect(adapter.queryTableData).toHaveBeenCalledWith('public', 'users', {
        page: 3,
        pageSize: 25,
        sortColumn: 'name',
        sortDirection: 'desc',
        search: 'alice',
        searchColumn: 'name',
      });
    });

    it('should propagate errors from the adapter', async () => {
      const adapter = createMockAdapter();
      (adapter.queryTableData as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Table not found: public.nonexistent'),
      );
      await expect(queryTableData(adapter, 'public', 'nonexistent')).rejects.toThrow(
        'Table not found',
      );
    });
  });
});
