import { describe, it, expect, vi } from 'vitest';
import { introspectSchema, introspectTable } from '../../src/services/schema-introspector.js';
import type { DatabaseAdapter } from '../../src/services/database-adapter.js';

function createMockAdapter(overrides: Partial<DatabaseAdapter> = {}): DatabaseAdapter {
  return {
    dialect: 'postgres',
    supportsSchemas: true,
    getTables: vi.fn().mockResolvedValue(['users', 'posts']),
    getColumns: vi.fn().mockResolvedValue([
      {
        name: 'id',
        dataType: 'integer',
        udtName: 'int4',
        isNullable: false,
        columnDefault: "nextval('users_id_seq')",
        isPrimaryKey: true,
        characterMaxLength: null,
        numericPrecision: 32,
      },
    ]),
    getForeignKeys: vi.fn().mockResolvedValue([]),
    getIndexes: vi
      .fn()
      .mockResolvedValue([{ name: 'users_pkey', isUnique: true, columns: ['id'] }]),
    getRowCount: vi.fn().mockResolvedValue(5),
    tableExists: vi.fn().mockResolvedValue(true),
    queryTableData: vi
      .fn()
      .mockResolvedValue({ rows: [], totalRows: 0, page: 1, pageSize: 50, totalPages: 0 }),
    close: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('SchemaIntrospector', () => {
  describe('introspectSchema', () => {
    it('should return all tables with metadata', async () => {
      const adapter = createMockAdapter();
      const schema = await introspectSchema(adapter);
      expect(schema.tables).toHaveLength(2);
      expect(schema.timestamp).toBeDefined();
      expect(schema.tables[0].name).toBe('users');
    });

    it('should call getTables with the given schema name', async () => {
      const adapter = createMockAdapter();
      await introspectSchema(adapter, 'custom_schema');
      expect(adapter.getTables).toHaveBeenCalledWith('custom_schema');
    });
  });

  describe('introspectTable', () => {
    it('should return column information', async () => {
      const adapter = createMockAdapter({
        getColumns: vi.fn().mockResolvedValue([
          {
            name: 'id',
            dataType: 'integer',
            udtName: 'int4',
            isNullable: false,
            columnDefault: null,
            isPrimaryKey: true,
            characterMaxLength: null,
            numericPrecision: 32,
          },
          {
            name: 'name',
            dataType: 'character varying',
            udtName: 'varchar',
            isNullable: true,
            columnDefault: null,
            isPrimaryKey: false,
            characterMaxLength: 255,
            numericPrecision: null,
          },
        ]),
        getRowCount: vi.fn().mockResolvedValue(42),
      });

      const table = await introspectTable(adapter, 'public', 'users');
      expect(table.name).toBe('users');
      expect(table.columns).toHaveLength(2);
      expect(table.columns[0].name).toBe('id');
      expect(table.columns[0].isPrimaryKey).toBe(true);
      expect(table.columns[1].name).toBe('name');
      expect(table.columns[1].isNullable).toBe(true);
      expect(table.rowCount).toBe(42);
    });

    it('should extract foreign keys', async () => {
      const adapter = createMockAdapter({
        getColumns: vi.fn().mockResolvedValue([]),
        getForeignKeys: vi.fn().mockResolvedValue([
          {
            constraintName: 'fk_user',
            columnName: 'user_id',
            referencedTable: 'users',
            referencedColumn: 'id',
          },
        ]),
        getRowCount: vi.fn().mockResolvedValue(0),
      });

      const table = await introspectTable(adapter, 'public', 'posts');
      expect(table.foreignKeys).toHaveLength(1);
      expect(table.foreignKeys[0].referencedTable).toBe('users');
    });

    it('should include indexes', async () => {
      const adapter = createMockAdapter({
        getColumns: vi.fn().mockResolvedValue([]),
        getIndexes: vi
          .fn()
          .mockResolvedValue([{ name: 'idx_email', isUnique: true, columns: ['email'] }]),
        getRowCount: vi.fn().mockResolvedValue(0),
      });

      const table = await introspectTable(adapter, 'public', 'users');
      expect(table.indexes).toHaveLength(1);
      expect(table.indexes[0].isUnique).toBe(true);
      expect(table.indexes[0].columns).toContain('email');
    });
  });
});
