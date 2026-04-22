import Database from 'better-sqlite3';
import type { DatabaseAdapter, QueryOptions } from './database-adapter.js';
import type { ColumnInfo, ForeignKey, IndexInfo, TableDataPage } from '../types/schema.js';

const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 50;

/** Map SQLite declared types to PostgreSQL-equivalent udtName values for client compatibility */
function mapSqliteType(declaredType: string | null): { dataType: string; udtName: string } {
  const t = (declaredType ?? 'TEXT').toUpperCase();

  if (t.includes('INT')) return { dataType: 'integer', udtName: 'int8' };
  if (t.includes('CHAR') || t.includes('CLOB') || t.includes('TEXT'))
    return { dataType: 'text', udtName: 'text' };
  if (t.includes('BLOB')) return { dataType: 'bytea', udtName: 'bytea' };
  if (t.includes('REAL') || t.includes('FLOA') || t.includes('DOUB'))
    return { dataType: 'double precision', udtName: 'float8' };
  if (t.includes('BOOL')) return { dataType: 'boolean', udtName: 'bool' };
  if (t.includes('DATE')) return { dataType: 'date', udtName: 'date' };
  if (t.includes('TIME')) return { dataType: 'timestamp', udtName: 'timestamp' };
  if (t.includes('JSON')) return { dataType: 'json', udtName: 'json' };
  if (t.includes('UUID')) return { dataType: 'uuid', udtName: 'uuid' };
  if (t.includes('NUMERIC') || t.includes('DECIMAL'))
    return { dataType: 'numeric', udtName: 'numeric' };

  return { dataType: 'text', udtName: 'text' };
}

export class SqliteAdapter implements DatabaseAdapter {
  readonly dialect = 'sqlite' as const;
  readonly supportsSchemas = false;

  private db: Database.Database;

  constructor(filePath: string) {
    this.db = new Database(filePath, { readonly: true });
    // Enable foreign keys (read-only safe)
    this.db.pragma('foreign_keys = ON');
  }

  async getTables(_schema: string): Promise<string[]> {
    const rows = this.db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      )
      .all() as { name: string }[];
    return rows.map((r) => r.name);
  }

  async getColumns(_schema: string, table: string): Promise<ColumnInfo[]> {
    const columns = this.db.prepare(`PRAGMA table_info("${table}")`).all() as {
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }[];

    return columns.map((col) => {
      const { dataType, udtName } = mapSqliteType(col.type);
      const isPrimaryKey = col.pk > 0;
      return {
        name: col.name,
        dataType,
        udtName,
        isNullable: isPrimaryKey ? false : col.notnull === 0,
        columnDefault: col.dflt_value,
        isPrimaryKey,
        characterMaxLength: null,
        numericPrecision: null,
      };
    });
  }

  async getForeignKeys(_schema: string, table: string): Promise<ForeignKey[]> {
    const fks = this.db.prepare(`PRAGMA foreign_key_list("${table}")`).all() as {
      id: number;
      seq: number;
      table: string;
      from: string;
      to: string;
    }[];

    return fks.map((fk) => ({
      constraintName: `fk_${table}_${fk.from}_${fk.id}`,
      columnName: fk.from,
      referencedTable: fk.table,
      referencedColumn: fk.to,
    }));
  }

  async getIndexes(_schema: string, table: string): Promise<IndexInfo[]> {
    const indexes = this.db.prepare(`PRAGMA index_list("${table}")`).all() as {
      seq: number;
      name: string;
      unique: number;
      origin: string;
      partial: number;
    }[];

    return indexes.map((idx) => {
      const cols = this.db.prepare(`PRAGMA index_info("${idx.name}")`).all() as {
        seqno: number;
        cid: number;
        name: string;
      }[];

      return {
        name: idx.name,
        isUnique: idx.unique === 1,
        columns: cols.map((c) => c.name),
      };
    });
  }

  async getRowCount(_schema: string, table: string): Promise<number> {
    const row = this.db
      .prepare(`SELECT count(*) AS count FROM "${table}"`)
      .get() as { count: number };
    return row.count;
  }

  async tableExists(_schema: string, table: string): Promise<boolean> {
    const row = this.db
      .prepare(
        `SELECT count(*) AS count FROM sqlite_master
         WHERE type = 'table' AND name = ?`,
      )
      .get(table) as { count: number };
    return row.count > 0;
  }

  async queryTableData(
    _schema: string,
    table: string,
    options: QueryOptions = {},
  ): Promise<TableDataPage> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * pageSize;

    if (!(await this.tableExists(_schema, table))) {
      throw new Error(`Table not found: ${table}`);
    }

    // Validate sort column exists
    let orderClause = '';
    if (options.sortColumn) {
      const columns = await this.getColumnNames(table);
      if (columns.includes(options.sortColumn)) {
        const dir = options.sortDirection === 'desc' ? 'DESC' : 'ASC';
        orderClause = `ORDER BY "${options.sortColumn}" ${dir}`;
      }
    }

    // Build WHERE clause for search
    let whereClause = '';
    const queryParams: unknown[] = [];

    if (options.search && options.search.trim()) {
      const searchTerm = `%${options.search.trim()}%`;

      if (options.searchColumn) {
        const columns = await this.getColumnNames(table);
        if (columns.includes(options.searchColumn)) {
          whereClause = `WHERE CAST("${options.searchColumn}" AS TEXT) LIKE ? COLLATE NOCASE`;
          queryParams.push(searchTerm);
        }
      } else {
        const columns = await this.getColumnNames(table);
        if (columns.length > 0) {
          const conditions = columns.map((col) => {
            queryParams.push(searchTerm);
            return `CAST("${col}" AS TEXT) LIKE ? COLLATE NOCASE`;
          });
          whereClause = `WHERE ${conditions.join(' OR ')}`;
        }
      }
    }

    const countRow = this.db
      .prepare(`SELECT count(*) AS count FROM "${table}" ${whereClause}`)
      .get(...queryParams) as { count: number };
    const totalRows = countRow.count;

    const dataRows = this.db
      .prepare(
        `SELECT * FROM "${table}" ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      )
      .all(...queryParams, pageSize, offset) as Record<string, unknown>[];

    return {
      rows: dataRows,
      totalRows,
      page,
      pageSize,
      totalPages: Math.ceil(totalRows / pageSize),
    };
  }

  async close(): Promise<void> {
    this.db.close();
  }

  private async getColumnNames(table: string): Promise<string[]> {
    const columns = this.db.prepare(`PRAGMA table_info("${table}")`).all() as {
      name: string;
    }[];
    return columns.map((c) => c.name);
  }
}
