import pg from 'pg';
import type { TableDataPage } from '../types/schema.js';

const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 50;

export async function queryTableData(
  pool: pg.Pool,
  schemaName: string,
  tableName: string,
  options: {
    page?: number;
    pageSize?: number;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    search?: string;
    searchColumn?: string;
  } = {},
): Promise<TableDataPage> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  // Validate that the table exists before querying
  const tableCheck = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = $1 AND table_name = $2
     ) AS exists`,
    [schemaName, tableName],
  );

  if (!tableCheck.rows[0].exists) {
    throw new Error(`Table not found: ${schemaName}.${tableName}`);
  }

  // Build ORDER BY clause safely
  let orderClause = '';
  if (options.sortColumn) {
    const colCheck = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
       ) AS exists`,
      [schemaName, tableName, options.sortColumn],
    );
    if (colCheck.rows[0].exists) {
      const dir = options.sortDirection === 'desc' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY "${options.sortColumn}" ${dir}`;
    }
  }

  // Build WHERE clause for search
  let whereClause = '';
  const queryParams: unknown[] = [];
  let paramIdx = 1;

  if (options.search && options.search.trim()) {
    const searchTerm = `%${options.search.trim()}%`;

    if (options.searchColumn) {
      // Search a specific column — validate it exists first
      const colCheck = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
         ) AS exists`,
        [schemaName, tableName, options.searchColumn],
      );
      if (colCheck.rows[0].exists) {
        whereClause = `WHERE "${options.searchColumn}"::text ILIKE $${paramIdx}`;
        queryParams.push(searchTerm);
        paramIdx++;
      }
    } else {
      // Search across all text-castable columns
      const colResult = await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schemaName, tableName],
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

  const countResult = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM "${schemaName}"."${tableName}" ${whereClause}`,
    queryParams,
  );
  const totalRows = parseInt(countResult.rows[0].count, 10);

  // For the data query, reuse the same params and add LIMIT/OFFSET
  const dataParams = [...queryParams, pageSize, offset];
  const dataResult = await pool.query(
    `SELECT * FROM "${schemaName}"."${tableName}" ${whereClause} ${orderClause} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
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
