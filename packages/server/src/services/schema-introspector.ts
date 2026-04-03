import pg from 'pg';
import type { ColumnInfo, ForeignKey, IndexInfo, TableInfo, SchemaOverview } from '../types/schema.js';

export async function introspectSchema(
  pool: pg.Pool,
  schemaName = 'public',
): Promise<SchemaOverview> {
  const tables = await getTables(pool, schemaName);

  const tableInfos = await Promise.all(
    tables.map((tableName) => introspectTable(pool, schemaName, tableName)),
  );

  return {
    tables: tableInfos,
    timestamp: new Date().toISOString(),
  };
}

export async function introspectTable(
  pool: pg.Pool,
  schemaName: string,
  tableName: string,
): Promise<TableInfo> {
  const [columns, foreignKeys, indexes, rowCount] = await Promise.all([
    getColumns(pool, schemaName, tableName),
    getForeignKeys(pool, schemaName, tableName),
    getIndexes(pool, schemaName, tableName),
    getRowCount(pool, schemaName, tableName),
  ]);

  const primaryKeys = columns.filter((c) => c.isPrimaryKey).map((c) => c.name);

  return {
    name: tableName,
    schema: schemaName,
    rowCount,
    columns,
    primaryKeys,
    foreignKeys,
    indexes,
  };
}

async function getTables(pool: pg.Pool, schemaName: string): Promise<string[]> {
  const result = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schemaName],
  );
  return result.rows.map((r) => r.table_name);
}

async function getColumns(
  pool: pg.Pool,
  schemaName: string,
  tableName: string,
): Promise<ColumnInfo[]> {
  const result = await pool.query<{
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
    [schemaName, tableName],
  );

  const pkColumns = await getPrimaryKeyColumns(pool, schemaName, tableName);

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

async function getPrimaryKeyColumns(
  pool: pg.Pool,
  schemaName: string,
  tableName: string,
): Promise<Set<string>> {
  const result = await pool.query<{ column_name: string }>(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
     WHERE tc.constraint_type = 'PRIMARY KEY'
       AND tc.table_schema = $1
       AND tc.table_name = $2`,
    [schemaName, tableName],
  );
  return new Set(result.rows.map((r) => r.column_name));
}

async function getForeignKeys(
  pool: pg.Pool,
  schemaName: string,
  tableName: string,
): Promise<ForeignKey[]> {
  const result = await pool.query<{
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
    [schemaName, tableName],
  );

  return result.rows.map((r) => ({
    constraintName: r.constraint_name,
    columnName: r.column_name,
    referencedTable: r.referenced_table,
    referencedColumn: r.referenced_column,
  }));
}

async function getIndexes(
  pool: pg.Pool,
  schemaName: string,
  tableName: string,
): Promise<IndexInfo[]> {
  const result = await pool.query<{
    indexname: string;
    indexdef: string;
  }>(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = $1
       AND tablename = $2`,
    [schemaName, tableName],
  );

  return result.rows.map((r) => ({
    name: r.indexname,
    isUnique: r.indexdef.includes('UNIQUE'),
    columns: extractIndexColumns(r.indexdef),
  }));
}

function extractIndexColumns(indexDef: string): string[] {
  const match = indexDef.match(/\(([^)]+)\)/);
  if (!match) return [];
  return match[1].split(',').map((c) => c.trim());
}

async function getRowCount(
  pool: pg.Pool,
  schemaName: string,
  tableName: string,
): Promise<number> {
  // Use pg_stat estimate for large tables, exact count for small ones
  const estimate = await pool.query<{ reltuples: number }>(
    `SELECT reltuples::bigint
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = $1
       AND c.relname = $2`,
    [schemaName, tableName],
  );

  const estimated = estimate.rows[0]?.reltuples ?? -1;

  // If the estimate is small or unknown, do an exact count
  if (estimated < 10000) {
    const exact = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM "${schemaName}"."${tableName}"`,
    );
    return parseInt(exact.rows[0].count, 10);
  }

  return estimated;
}
