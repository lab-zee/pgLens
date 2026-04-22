import type { DatabaseAdapter, QueryOptions } from './database-adapter.js';
import type { TableDataPage } from '../types/schema.js';

export async function queryTableData(
  adapter: DatabaseAdapter,
  schemaName: string,
  tableName: string,
  options: QueryOptions = {},
): Promise<TableDataPage> {
  return adapter.queryTableData(schemaName, tableName, options);
}
