import type { ColumnInfo, ForeignKey, IndexInfo, TableDataPage } from '../types/schema.js';

export interface QueryOptions {
  page?: number;
  pageSize?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  searchColumn?: string;
}

export interface DatabaseAdapter {
  /** Database dialect identifier */
  readonly dialect: 'postgres' | 'sqlite';

  /** Whether this database supports schemas (e.g., PostgreSQL does, SQLite does not) */
  readonly supportsSchemas: boolean;

  /** List all user tables in the given schema */
  getTables(schema: string): Promise<string[]>;

  /** Get column metadata for a table */
  getColumns(schema: string, table: string): Promise<ColumnInfo[]>;

  /** Get foreign key relationships for a table */
  getForeignKeys(schema: string, table: string): Promise<ForeignKey[]>;

  /** Get indexes for a table */
  getIndexes(schema: string, table: string): Promise<IndexInfo[]>;

  /** Get row count (estimated for large tables if supported) */
  getRowCount(schema: string, table: string): Promise<number>;

  /** Check if a table exists */
  tableExists(schema: string, table: string): Promise<boolean>;

  /** Query paginated, sortable, searchable table data */
  queryTableData(schema: string, table: string, options: QueryOptions): Promise<TableDataPage>;

  /** Close the connection */
  close(): Promise<void>;
}
