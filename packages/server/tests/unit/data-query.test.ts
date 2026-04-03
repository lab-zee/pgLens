import { describe, it, expect, vi } from 'vitest';
import { queryTableData } from '../../src/services/data-query.js';

function createMockPool(
  rows: Record<string, unknown>[],
  totalCount: number,
  columnNames: string[] = ['id', 'name', 'email'],
) {
  return {
    query: vi.fn((sql: string, _params?: unknown[]) => {
      if (sql.includes('EXISTS') && sql.includes('information_schema.tables')) {
        return Promise.resolve({ rows: [{ exists: true }] });
      }
      if (sql.includes('EXISTS') && sql.includes('information_schema.columns')) {
        return Promise.resolve({ rows: [{ exists: true }] });
      }
      if (sql.includes('SELECT column_name FROM information_schema.columns')) {
        return Promise.resolve({
          rows: columnNames.map((c) => ({ column_name: c })),
        });
      }
      if (sql.includes('count(*)')) {
        return Promise.resolve({ rows: [{ count: String(totalCount) }] });
      }
      if (sql.includes('SELECT *')) {
        return Promise.resolve({ rows });
      }
      return Promise.resolve({ rows: [] });
    }),
  } as unknown as import('pg').Pool;
}

describe('DataQuery', () => {
  describe('queryTableData', () => {
    it('should return paginated data', async () => {
      const mockRows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const pool = createMockPool(mockRows, 100);

      const result = await queryTableData(pool, 'public', 'users');
      expect(result.rows).toEqual(mockRows);
      expect(result.totalRows).toBe(100);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(result.totalPages).toBe(2);
    });

    it('should respect page and pageSize options', async () => {
      const pool = createMockPool([], 200);

      const result = await queryTableData(pool, 'public', 'users', {
        page: 3,
        pageSize: 25,
      });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
      expect(result.totalPages).toBe(8);

      // Verify offset in the SQL query
      const selectCall = pool.query.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('SELECT *'),
      );
      expect(selectCall).toBeDefined();
      expect(selectCall![1]).toContain(50); // offset = (3-1) * 25 = 50
    });

    it('should clamp page to minimum of 1', async () => {
      const pool = createMockPool([], 10);
      const result = await queryTableData(pool, 'public', 'users', { page: -5 });
      expect(result.page).toBe(1);
    });

    it('should cap pageSize at 500', async () => {
      const pool = createMockPool([], 10);
      const result = await queryTableData(pool, 'public', 'users', { pageSize: 1000 });
      expect(result.pageSize).toBe(500);
    });

    it('should throw for non-existent table', async () => {
      const pool = {
        query: vi.fn((sql: string) => {
          if (sql.includes('EXISTS')) {
            return Promise.resolve({ rows: [{ exists: false }] });
          }
          return Promise.resolve({ rows: [] });
        }),
      } as unknown as import('pg').Pool;

      await expect(queryTableData(pool, 'public', 'nonexistent')).rejects.toThrow(
        'Table not found',
      );
    });

    it('should support sorting', async () => {
      const pool = createMockPool([], 10);

      await queryTableData(pool, 'public', 'users', {
        sortColumn: 'name',
        sortDirection: 'desc',
      });

      const selectCall = pool.query.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('SELECT *'),
      );
      expect(selectCall![0]).toContain('ORDER BY "name" DESC');
    });

    it('should search across all columns when search is provided', async () => {
      const pool = createMockPool([], 5, ['id', 'name', 'email']);

      await queryTableData(pool, 'public', 'users', { search: 'alice' });

      const selectCall = pool.query.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('SELECT *'),
      );
      const sql = selectCall![0] as string;
      expect(sql).toContain('WHERE');
      expect(sql).toContain('"id"::text ILIKE');
      expect(sql).toContain('"name"::text ILIKE');
      expect(sql).toContain('"email"::text ILIKE');
      expect(sql).toContain(' OR ');
    });

    it('should search a specific column when searchColumn is provided', async () => {
      const pool = createMockPool([], 3);

      await queryTableData(pool, 'public', 'users', {
        search: 'alice',
        searchColumn: 'name',
      });

      const selectCall = pool.query.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('SELECT *'),
      );
      const sql = selectCall![0] as string;
      expect(sql).toContain('WHERE "name"::text ILIKE');
      // Should NOT search other columns
      expect(sql).not.toContain('"email"');
    });

    it('should not add WHERE clause for empty search', async () => {
      const pool = createMockPool([], 10);

      await queryTableData(pool, 'public', 'users', { search: '  ' });

      const selectCall = pool.query.mock.calls.find(
        (call: unknown[]) => typeof call[0] === 'string' && (call[0] as string).includes('SELECT *'),
      );
      const sql = selectCall![0] as string;
      expect(sql).not.toContain('WHERE');
    });

    it('should reset to page 1 counts correctly when searching', async () => {
      const pool = createMockPool([{ id: 1, name: 'Alice' }], 1, ['id', 'name']);

      const result = await queryTableData(pool, 'public', 'users', {
        search: 'alice',
        page: 1,
        pageSize: 50,
      });
      expect(result.totalRows).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });
});
