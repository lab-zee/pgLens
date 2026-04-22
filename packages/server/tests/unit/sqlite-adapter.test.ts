import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteAdapter } from '../../src/services/sqlite-adapter.js';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SqliteAdapter', () => {
  let dbPath: string;
  let tempDir: string;
  let adapter: SqliteAdapter;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'pglens-test-'));
    dbPath = join(tempDir, 'test.db');

    // Create a test database with schema
    const db = new Database(dbPath);
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        is_active BOOLEAN DEFAULT 1,
        score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        body TEXT,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX idx_posts_user_id ON posts(user_id);
      CREATE UNIQUE INDEX idx_users_email ON users(email);

      INSERT INTO users (name, email, is_active, score) VALUES
        ('Alice', 'alice@example.com', 1, 95.5),
        ('Bob', 'bob@example.com', 0, 82.3),
        ('Charlie', 'charlie@example.com', 1, 71.0);

      INSERT INTO posts (title, body, user_id) VALUES
        ('Hello World', 'First post content', 1),
        ('Second Post', 'More content here', 1),
        ('Bobs Post', 'Bob writes too', 2);
    `);
    db.close();

    adapter = new SqliteAdapter(dbPath);
  });

  afterEach(async () => {
    await adapter.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should have correct dialect and supportsSchemas', () => {
    expect(adapter.dialect).toBe('sqlite');
    expect(adapter.supportsSchemas).toBe(false);
  });

  describe('getTables', () => {
    it('should list all user tables', async () => {
      const tables = await adapter.getTables('main');
      expect(tables).toContain('users');
      expect(tables).toContain('posts');
      expect(tables).not.toContain('sqlite_sequence');
    });
  });

  describe('getColumns', () => {
    it('should return column metadata', async () => {
      const columns = await adapter.getColumns('main', 'users');
      expect(columns.length).toBeGreaterThanOrEqual(5);

      const idCol = columns.find((c) => c.name === 'id')!;
      expect(idCol.isPrimaryKey).toBe(true);
      expect(idCol.udtName).toBe('int8');
      expect(idCol.isNullable).toBe(false);

      const nameCol = columns.find((c) => c.name === 'name')!;
      expect(nameCol.udtName).toBe('text');
      expect(nameCol.isNullable).toBe(false);

      const activeCol = columns.find((c) => c.name === 'is_active')!;
      expect(activeCol.udtName).toBe('bool');

      const scoreCol = columns.find((c) => c.name === 'score')!;
      expect(scoreCol.udtName).toBe('float8');
    });
  });

  describe('getForeignKeys', () => {
    it('should return foreign key relationships', async () => {
      const fks = await adapter.getForeignKeys('main', 'posts');
      expect(fks).toHaveLength(1);
      expect(fks[0].columnName).toBe('user_id');
      expect(fks[0].referencedTable).toBe('users');
      expect(fks[0].referencedColumn).toBe('id');
    });

    it('should return empty for tables without foreign keys', async () => {
      const fks = await adapter.getForeignKeys('main', 'users');
      expect(fks).toHaveLength(0);
    });
  });

  describe('getIndexes', () => {
    it('should return indexes with uniqueness info', async () => {
      const indexes = await adapter.getIndexes('main', 'users');
      const emailIdx = indexes.find((i) => i.name === 'idx_users_email');
      expect(emailIdx).toBeDefined();
      expect(emailIdx!.isUnique).toBe(true);
      expect(emailIdx!.columns).toContain('email');
    });

    it('should return non-unique indexes', async () => {
      const indexes = await adapter.getIndexes('main', 'posts');
      const userIdIdx = indexes.find((i) => i.name === 'idx_posts_user_id');
      expect(userIdIdx).toBeDefined();
      expect(userIdIdx!.isUnique).toBe(false);
      expect(userIdIdx!.columns).toContain('user_id');
    });
  });

  describe('getRowCount', () => {
    it('should return exact row count', async () => {
      const count = await adapter.getRowCount('main', 'users');
      expect(count).toBe(3);
    });
  });

  describe('tableExists', () => {
    it('should return true for existing tables', async () => {
      expect(await adapter.tableExists('main', 'users')).toBe(true);
    });

    it('should return false for non-existing tables', async () => {
      expect(await adapter.tableExists('main', 'nonexistent')).toBe(false);
    });
  });

  describe('queryTableData', () => {
    it('should return paginated data', async () => {
      const result = await adapter.queryTableData('main', 'users');
      expect(result.rows).toHaveLength(3);
      expect(result.totalRows).toBe(3);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should respect pagination', async () => {
      const result = await adapter.queryTableData('main', 'users', {
        page: 1,
        pageSize: 2,
      });
      expect(result.rows).toHaveLength(2);
      expect(result.totalRows).toBe(3);
      expect(result.totalPages).toBe(2);
    });

    it('should support sorting', async () => {
      const result = await adapter.queryTableData('main', 'users', {
        sortColumn: 'name',
        sortDirection: 'desc',
      });
      expect(result.rows[0].name).toBe('Charlie');
      expect(result.rows[2].name).toBe('Alice');
    });

    it('should support search across all columns', async () => {
      const result = await adapter.queryTableData('main', 'users', {
        search: 'alice',
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Alice');
    });

    it('should support search on a specific column', async () => {
      const result = await adapter.queryTableData('main', 'users', {
        search: 'bob',
        searchColumn: 'name',
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Bob');
    });

    it('should throw for non-existent table', async () => {
      await expect(adapter.queryTableData('main', 'nope')).rejects.toThrow('Table not found');
    });

    it('should cap page size at 500', async () => {
      const result = await adapter.queryTableData('main', 'users', { pageSize: 1000 });
      expect(result.pageSize).toBe(500);
    });
  });
});
