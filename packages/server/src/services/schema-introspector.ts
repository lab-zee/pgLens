import type { DatabaseAdapter } from './database-adapter.js';
import type { TableInfo, SchemaOverview } from '../types/schema.js';

export async function introspectSchema(
  adapter: DatabaseAdapter,
  schemaName = 'public',
): Promise<SchemaOverview> {
  const tables = await adapter.getTables(schemaName);

  const tableInfos = await Promise.all(
    tables.map((tableName) => introspectTable(adapter, schemaName, tableName)),
  );

  return {
    tables: tableInfos,
    timestamp: new Date().toISOString(),
  };
}

export async function introspectTable(
  adapter: DatabaseAdapter,
  schemaName: string,
  tableName: string,
): Promise<TableInfo> {
  const [columns, foreignKeys, indexes, rowCount] = await Promise.all([
    adapter.getColumns(schemaName, tableName),
    adapter.getForeignKeys(schemaName, tableName),
    adapter.getIndexes(schemaName, tableName),
    adapter.getRowCount(schemaName, tableName),
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
