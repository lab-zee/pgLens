import { describe, it, expect, vi } from 'vitest';
import { PostgresAdapter } from '../../src/services/postgres-adapter.js';

function createMockPool(queryResponses: Record<string, { rows: unknown[] }>) {
  return {
    query: vi.fn((sql: string, _params?: unknown[]) => {
      for (const [key, response] of Object.entries(queryResponses)) {
        if (sql.includes(key)) {
          return Promise.resolve(response);
        }
      }
      return Promise.resolve({ rows: [] });
    }),
    end: vi.fn().mockResolvedValue(undefined),
  } as unknown as import('pg').Pool;
}

describe('PostgresAdapter', () => {
  it('should have correct dialect and supportsSchemas', () => {
    const pool = createMockPool({});
    const adapter = new PostgresAdapter(pool);
    expect(adapter.dialect).toBe('postgres');
    expect(adapter.supportsSchemas).toBe(true);
  });

  describe('getTables', () => {
    it('should return table names from information_schema', async () => {
      const pool = createMockPool({
        'information_schema.tables': {
          rows: [{ table_name: 'users' }, { table_name: 'posts' }],
        },
      });
      const adapter = new PostgresAdapter(pool);
      const tables = await adapter.getTables('public');
      expect(tables).toEqual(['users', 'posts']);
    });
  });

  describe('getColumns', () => {
    it('should return column metadata with primary key detection', async () => {
      const pool = createMockPool({
        'information_schema.columns': {
          rows: [
            {
              column_name: 'id',
              data_type: 'integer',
              udt_name: 'int4',
              is_nullable: 'NO',
              column_default: "nextval('users_id_seq')",
              character_maximum_length: null,
              numeric_precision: 32,
            },
            {
              column_name: 'name',
              data_type: 'character varying',
              udt_name: 'varchar',
              is_nullable: 'YES',
              column_default: null,
              character_maximum_length: 255,
              numeric_precision: null,
            },
          ],
        },
        'table_constraints': {
          rows: [{ column_name: 'id' }],
        },
      });
      const adapter = new PostgresAdapter(pool);
      const columns = await adapter.getColumns('public', 'users');
      expect(columns).toHaveLength(2);
      expect(columns[0].name).toBe('id');
      expect(columns[0].isPrimaryKey).toBe(true);
      expect(columns[0].udtName).toBe('int4');
      expect(columns[1].name).toBe('name');
      expect(columns[1].isNullable).toBe(true);
    });
  });

  describe('getForeignKeys', () => {
    it('should return foreign key relationships', async () => {
      const pool = createMockPool({
        'FOREIGN KEY': {
          rows: [
            {
              constraint_name: 'fk_user',
              column_name: 'user_id',
              referenced_table: 'users',
              referenced_column: 'id',
            },
          ],
        },
      });
      const adapter = new PostgresAdapter(pool);
      const fks = await adapter.getForeignKeys('public', 'posts');
      expect(fks).toHaveLength(1);
      expect(fks[0].referencedTable).toBe('users');
    });
  });

  describe('getIndexes', () => {
    it('should parse index definitions', async () => {
      const pool = createMockPool({
        pg_indexes: {
          rows: [
            {
              indexname: 'idx_email',
              indexdef: 'CREATE UNIQUE INDEX idx_email ON users USING btree (email)',
            },
          ],
        },
      });
      const adapter = new PostgresAdapter(pool);
      const indexes = await adapter.getIndexes('public', 'users');
      expect(indexes).toHaveLength(1);
      expect(indexes[0].isUnique).toBe(true);
      expect(indexes[0].columns).toContain('email');
    });
  });

  describe('getRowCount', () => {
    it('should use exact count for small tables', async () => {
      const pool = createMockPool({
        reltuples: { rows: [{ reltuples: 42 }] },
        'count(*)': { rows: [{ count: '42' }] },
      });
      const adapter = new PostgresAdapter(pool);
      const count = await adapter.getRowCount('public', 'users');
      expect(count).toBe(42);
    });
  });

  describe('tableExists', () => {
    it('should return true for existing tables', async () => {
      const pool = createMockPool({
        EXISTS: { rows: [{ exists: true }] },
      });
      const adapter = new PostgresAdapter(pool);
      expect(await adapter.tableExists('public', 'users')).toBe(true);
    });

    it('should return false for non-existing tables', async () => {
      const pool = createMockPool({
        EXISTS: { rows: [{ exists: false }] },
      });
      const adapter = new PostgresAdapter(pool);
      expect(await adapter.tableExists('public', 'nope')).toBe(false);
    });
  });

  describe('queryTableData', () => {
    it('should return paginated data', async () => {
      const pool = createMockPool({
        'EXISTS': { rows: [{ exists: true }] },
        'count(*)': { rows: [{ count: '100' }] },
        'SELECT *': { rows: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] },
      });
      const adapter = new PostgresAdapter(pool);
      const result = await adapter.queryTableData('public', 'users');
      expect(result.rows).toHaveLength(2);
      expect(result.totalRows).toBe(100);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
    });

    it('should throw for non-existent table', async () => {
      const pool = createMockPool({
        EXISTS: { rows: [{ exists: false }] },
      });
      const adapter = new PostgresAdapter(pool);
      await expect(adapter.queryTableData('public', 'nope')).rejects.toThrow('Table not found');
    });
  });

  describe('close', () => {
    it('should end the pool', async () => {
      const pool = createMockPool({});
      const adapter = new PostgresAdapter(pool);
      await adapter.close();
      expect(pool.end).toHaveBeenCalled();
    });
  });
});
