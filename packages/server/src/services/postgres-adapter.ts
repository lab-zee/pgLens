import pg from 'pg';
import type { DatabaseAdapter, QueryOptions } from './database-adapter.js';
import type { ColumnInfo, ForeignKey, IndexInfo, TableDataPage } from '../types/schema.js';

const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 50;

export class PostgresAdapter implements DatabaseAdapter {
  readonly dialect = 'postgres' as const;
  readonly supportsSchemas = true;

  constructor(public readonly pool: pg.Pool) {}

  async getTables(schema: string): Promise<string[]> {
    const result = await this.pool.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [schema],
    );
    return result.rows.map((r) => r.table_name);
  }

  async getColumns(schema: string, table: string): Promise<ColumnInfo[]> {
    const result = await this.pool.query<{
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
      column_default: string | null;
      character_maximum_length: number | null;
      numeric_precision: number | null;
    }>(
      `SELECT
         c.column_name,
         c.data_type,
         c.udt_name,
         c.is_nullable,
         c.column_default,
         c.character_maximum_length,
         c.numeric_precision
       FROM information_schema.columns c
       WHERE c.table_schema = $1
         AND c.table_name = $2
       ORDER BY c.ordinal_position`,
      [schema, table],
    );

    const pkColumns = await this.getPrimaryKeyColumns(schema, table);

    return result.rows.map((r) => ({
      name: r.column_name,
      dataType: r.data_type,
      udtName: r.udt_name,
      isNullable: r.is_nullable === 'YES',
      columnDefault: r.column_default,
      isPrimaryKey: pkColumns.has(r.column_name),
      characterMaxLength: r.character_maximum_length,
      numericPrecision: r.numeric_precision,
    }));
  }

  private async getPrimaryKeyColumns(schema: string, table: string): Promise<Set<string>> {
    const result = await this.pool.query<{ column_name: string }>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = $1
         AND tc.table_name = $2`,
      [schema, table],
    );
    return new Set(result.rows.map((r) => r.column_name));
  }

  async getForeignKeys(schema: string, table: string): Promise<ForeignKey[]> {
    const result = await this.pool.query<{
      constraint_name: string;
      column_name: string;
      referenced_table: string;
      referenced_column: string;
    }>(
      `SELECT
         tc.constraint_name,
         kcu.column_name,
         ccu.table_name AS referenced_table,
         ccu.column_name AS referenced_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = $1
         AND tc.table_name = $2`,
      [schema, table],
    );

    return result.rows.map((r) => ({
      constraintName: r.constraint_name,
      columnName: r.column_name,
      referencedTable: r.referenced_table,
      referencedColumn: r.referenced_column,
    }));
  }

  async getIndexes(schema: string, table: string): Promise<IndexInfo[]> {
    const result = await this.pool.query<{
      indexname: string;
      indexdef: string;
    }>(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = $1
         AND tablename = $2`,
      [schema, table],
    );

    return result.rows.map((r) => ({
      name: r.indexname,
      isUnique: r.indexdef.includes('UNIQUE'),
      columns: extractIndexColumns(r.indexdef),
    }));
  }

  async getRowCount(schema: string, table: string): Promise<number> {
    const estimate = await this.pool.query<{ reltuples: number }>(
      `SELECT reltuples::bigint
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1
         AND c.relname = $2`,
      [schema, table],
    );

    const estimated = estimate.rows[0]?.reltuples ?? -1;

    if (estimated < 10000) {
      const exact = await this.pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM "${schema}"."${table}"`,
      );
      return parseInt(exact.rows[0].count, 10);
    }

    return estimated;
  }

  async tableExists(schema: string, table: string): Promise<boolean> {
    const result = await this.pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = $2
       ) AS exists`,
      [schema, table],
    );
    return result.rows[0].exists;
  }

  async queryTableData(
    schema: string,
    table: string,
    options: QueryOptions = {},
  ): Promise<TableDataPage> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * pageSize;

    if (!(await this.tableExists(schema, table))) {
      throw new Error(`Table not found: ${schema}.${table}`);
    }

    let orderClause = '';
    if (options.sortColumn) {
      const colCheck = await this.pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
         ) AS exists`,
        [schema, table, options.sortColumn],
      );
      if (colCheck.rows[0].exists) {
        const dir = options.sortDirection === 'desc' ? 'DESC' : 'ASC';
        orderClause = `ORDER BY "${options.sortColumn}" ${dir}`;
      }
    }

    let whereClause = '';
    const queryParams: unknown[] = [];
    let paramIdx = 1;

    if (options.search && options.search.trim()) {
      const searchTerm = `%${options.search.trim()}%`;

      if (options.searchColumn) {
        const colCheck = await this.pool.query<{ exists: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
           ) AS exists`,
          [schema, table, options.searchColumn],
        );
        if (colCheck.rows[0].exists) {
          whereClause = `WHERE "${options.searchColumn}"::text ILIKE $${paramIdx}`;
          queryParams.push(searchTerm);
          paramIdx++;
        }
      } else {
        const colResult = await this.pool.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = $1 AND table_name = $2
           ORDER BY ordinal_position`,
          [schema, table],
        );
        const columns = colResult.rows.map((r) => r.column_name);
        if (columns.length > 0) {
          const conditions = columns.map((col) => {
            const p = `$${paramIdx}`;
            paramIdx++;
            queryParams.push(searchTerm);
            return `"${col}"::text ILIKE ${p}`;
          });
          whereClause = `WHERE ${conditions.join(' OR ')}`;
        }
      }
    }

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM "${schema}"."${table}" ${whereClause}`,
      queryParams,
    );
    const totalRows = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...queryParams, pageSize, offset];
    const dataResult = await this.pool.query(
      `SELECT * FROM "${schema}"."${table}" ${whereClause} ${orderClause} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      dataParams,
    );

    return {
      rows: dataResult.rows,
      totalRows,
      page,
      pageSize,
      totalPages: Math.ceil(totalRows / pageSize),
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

function extractIndexColumns(indexDef: string): string[] {
  const match = indexDef.match(/\(([^)]+)\)/);
  if (!match) return [];
  return match[1].split(',').map((c) => c.trim());
}
