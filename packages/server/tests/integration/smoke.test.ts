/**
 * Integration smoke test against a real PostgreSQL database.
 *
 * Set DATABASE_URL to a read-only connection string to run.
 * Skipped automatically when DATABASE_URL is not set.
 *
 * IMPORTANT: This test only performs SELECT queries — never writes.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { introspectSchema } from '../../src/services/schema-introspector.js';
import { queryTableData } from '../../src/services/data-query.js';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

const describeIf = DATABASE_URL ? describe : describe.skip;

describeIf('Integration: Real PostgreSQL', () => {
  let pool: pg.Pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 2,
      connectionTimeoutMillis: 10_000,
      // Set read-only at the session level for safety
      options: '-c default_transaction_read_only=on',
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should connect and run a basic query', async () => {
    const result = await pool.query('SELECT 1 AS ok');
    expect(result.rows[0].ok).toBe(1);
  });

  it('should introspect the schema and find tables', async () => {
    const schema = await introspectSchema(pool);
    expect(schema.tables).toBeDefined();
    expect(Array.isArray(schema.tables)).toBe(true);
    // Log what we found for visibility
    console.log(
      `Found ${schema.tables.length} tables:`,
      schema.tables.map((t) => `${t.name} (${t.rowCount} rows, ${t.columns.length} cols)`),
    );
  });

  it('should introspect each table with columns and metadata', async () => {
    const schema = await introspectSchema(pool);
    for (const table of schema.tables) {
      expect(table.name).toBeTruthy();
      expect(table.columns.length).toBeGreaterThan(0);
      for (const col of table.columns) {
        expect(col.name).toBeTruthy();
        expect(col.dataType).toBeTruthy();
        expect(col.udtName).toBeTruthy();
      }
    }
  });

  it('should query data from tables (page 1, read-only)', async () => {
    const schema = await introspectSchema(pool);
    if (schema.tables.length === 0) return;

    const table = schema.tables[0];
    const data = await queryTableData(pool, 'public', table.name, {
      page: 1,
      pageSize: 5,
    });

    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(5);
    expect(data.totalRows).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(data.rows)).toBe(true);
    console.log(
      `Table "${table.name}": ${data.totalRows} rows, sample keys:`,
      data.rows[0] ? Object.keys(data.rows[0]) : '(empty)',
    );
  });

  it('should refuse write operations', async () => {
    await expect(pool.query('CREATE TABLE _pglens_test_should_fail (id int)')).rejects.toThrow();
  });
});
