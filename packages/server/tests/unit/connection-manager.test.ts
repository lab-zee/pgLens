import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pg before importing the module under test
const mockRelease = vi.fn();
const mockQuery = vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });
const mockConnect = vi.fn().mockResolvedValue({ query: mockQuery, release: mockRelease });
const mockEnd = vi.fn().mockResolvedValue(undefined);

vi.mock('pg', () => {
  return {
    default: {
      Pool: vi.fn(() => ({
        connect: mockConnect,
        end: mockEnd,
        query: mockQuery,
      })),
    },
  };
});

// Mock better-sqlite3
vi.mock('better-sqlite3', () => {
  const mockPrepare = vi.fn().mockReturnValue({
    all: vi.fn().mockReturnValue([{ name: 'test_table' }]),
    get: vi.fn().mockReturnValue({ count: 0 }),
  });
  const MockDatabase = vi.fn(() => ({
    prepare: mockPrepare,
    pragma: vi.fn(),
    close: vi.fn(),
  }));
  return { default: MockDatabase };
});

import * as connectionManager from '../../src/services/connection-manager.js';
import { detectDialect } from '../../src/services/connection-manager.js';

describe('ConnectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectDialect', () => {
    it('should detect PostgreSQL connection strings', () => {
      expect(detectDialect('postgresql://test@localhost/testdb')).toBe('postgres');
      expect(detectDialect('postgres://user:pass@host:5432/db')).toBe('postgres');
    });

    it('should detect SQLite file paths by extension', () => {
      expect(detectDialect('/path/to/database.db')).toBe('sqlite');
      expect(detectDialect('/path/to/database.sqlite')).toBe('sqlite');
      expect(detectDialect('/path/to/database.sqlite3')).toBe('sqlite');
    });

    it('should detect sqlite: prefix', () => {
      expect(detectDialect('sqlite:/path/to/database.db')).toBe('sqlite');
      expect(detectDialect('sqlite::memory:')).toBe('sqlite');
    });

    it('should detect :memory:', () => {
      expect(detectDialect(':memory:')).toBe('sqlite');
    });
  });

  describe('connect (PostgreSQL)', () => {
    it('should return a connection ID on successful connect', async () => {
      const id = await connectionManager.connect('postgresql://test@localhost/testdb');
      expect(id).toMatch(/^conn_/);
    });

    it('should verify the connection with a SELECT 1 query', async () => {
      await connectionManager.connect('postgresql://test@localhost/testdb');
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should throw when the connection fails', async () => {
      mockConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await expect(connectionManager.connect('postgresql://bad@localhost/nope')).rejects.toThrow(
        'ECONNREFUSED',
      );
    });
  });

  describe('connect (SQLite)', () => {
    it('should return a connection ID for SQLite', async () => {
      const id = await connectionManager.connect('sqlite:/tmp/test.db');
      expect(id).toMatch(/^conn_/);
    });

    it('should strip sqlite: prefix from path', async () => {
      const id = await connectionManager.connect('sqlite:/tmp/test.db');
      const adapter = connectionManager.getAdapter(id);
      expect(adapter.dialect).toBe('sqlite');
    });
  });

  describe('getAdapter', () => {
    it('should return the adapter for a valid connection', async () => {
      const id = await connectionManager.connect('postgresql://test@localhost/testdb');
      const adapter = connectionManager.getAdapter(id);
      expect(adapter).toBeDefined();
      expect(adapter.dialect).toBe('postgres');
    });

    it('should throw for an unknown connection ID', () => {
      expect(() => connectionManager.getAdapter('conn_nonexistent')).toThrow(
        'Connection not found',
      );
    });
  });

  describe('disconnect', () => {
    it('should close the adapter and remove the connection', async () => {
      const id = await connectionManager.connect('postgresql://test@localhost/testdb');
      await connectionManager.disconnect(id);
      expect(() => connectionManager.getAdapter(id)).toThrow('Connection not found');
    });

    it('should be a no-op for unknown IDs', async () => {
      await expect(connectionManager.disconnect('conn_unknown')).resolves.toBeUndefined();
    });
  });

  describe('listConnections', () => {
    it('should list active connections with timestamps', async () => {
      const id = await connectionManager.connect('postgresql://test@localhost/testdb');
      const list = connectionManager.listConnections();
      const found = list.find((c) => c.id === id);
      expect(found).toBeDefined();
      expect(found!.connectedAt).toBeInstanceOf(Date);
      expect(found!.lastUsed).toBeInstanceOf(Date);
    });
  });

  describe('disconnectAll', () => {
    it('should disconnect all active connections', async () => {
      await connectionManager.connect('postgresql://test@localhost/db1');
      await connectionManager.connect('postgresql://test@localhost/db2');
      await connectionManager.disconnectAll();
      expect(connectionManager.listConnections()).toHaveLength(0);
    });
  });
});
