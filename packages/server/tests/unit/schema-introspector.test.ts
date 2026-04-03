import { describe, it, expect, vi } from 'vitest';
import { introspectSchema, introspectTable } from '../../src/services/schema-introspector.js';

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
  } as unknown as import('pg').Pool;
}

describe('SchemaIntrospector', () => {
  describe('introspectSchema', () => {
    it('should return all tables with metadata', async () => {
      const pool = createMockPool({
        'information_schema.tables': {
          rows: [{ table_name: 'users' }, { table_name: 'posts' }],
        },
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
          ],
        },
        'table_constraints': {
          rows: [{ column_name: 'id' }],
        },
        'constraint_column_usage': {
          rows: [],
        },
        pg_indexes: {
          rows: [{ indexname: 'users_pkey', indexdef: 'CREATE UNIQUE INDEX users_pkey ON users USING btree (id)' }],
        },
        reltuples: {
          rows: [{ reltuples: 5 }],
        },
        'count(*)': {
          rows: [{ count: '5' }],
        },
      });

      const schema = await introspectSchema(pool);
      expect(schema.tables).toHaveLength(2);
      expect(schema.timestamp).toBeDefined();
      expect(schema.tables[0].name).toBe('users');
    });
  });

  describe('introspectTable', () => {
    it('should return column information', async () => {
      const pool = createMockPool({
        'information_schema.columns': {
          rows: [
            {
              column_name: 'id',
              data_type: 'integer',
              udt_name: 'int4',
              is_nullable: 'NO',
              column_default: null,
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
        'constraint_column_usage': {
          rows: [],
        },
        pg_indexes: {
          rows: [],
        },
        reltuples: {
          rows: [{ reltuples: 42 }],
        },
        'count(*)': {
          rows: [{ count: '42' }],
        },
      });

      const table = await introspectTable(pool, 'public', 'users');
      expect(table.name).toBe('users');
      expect(table.columns).toHaveLength(2);
      expect(table.columns[0].name).toBe('id');
      expect(table.columns[0].isPrimaryKey).toBe(true);
      expect(table.columns[1].name).toBe('name');
      expect(table.columns[1].isNullable).toBe(true);
      expect(table.rowCount).toBe(42);
    });

    it('should extract foreign keys', async () => {
      const pool = createMockPool({
        'information_schema.columns': { rows: [] },
        'PRIMARY KEY': { rows: [] },
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
        pg_indexes: { rows: [] },
        reltuples: { rows: [{ reltuples: 0 }] },
        'count(*)': { rows: [{ count: '0' }] },
      });

      const table = await introspectTable(pool, 'public', 'posts');
      expect(table.foreignKeys).toHaveLength(1);
      expect(table.foreignKeys[0].referencedTable).toBe('users');
    });

    it('should parse index definitions', async () => {
      const pool = createMockPool({
        'information_schema.columns': { rows: [] },
        'table_constraints': { rows: [] },
        'constraint_column_usage': { rows: [] },
        pg_indexes: {
          rows: [
            {
              indexname: 'idx_email',
              indexdef: 'CREATE UNIQUE INDEX idx_email ON users USING btree (email)',
            },
          ],
        },
        reltuples: { rows: [{ reltuples: 0 }] },
        'count(*)': { rows: [{ count: '0' }] },
      });

      const table = await introspectTable(pool, 'public', 'users');
      expect(table.indexes).toHaveLength(1);
      expect(table.indexes[0].isUnique).toBe(true);
      expect(table.indexes[0].columns).toContain('email');
    });
  });
});
