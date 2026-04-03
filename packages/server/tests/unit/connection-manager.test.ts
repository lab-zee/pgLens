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

import * as connectionManager from '../../src/services/connection-manager.js';

describe('ConnectionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
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

  describe('getPool', () => {
    it('should return the pool for a valid connection', async () => {
      const id = await connectionManager.connect('postgresql://test@localhost/testdb');
      const pool = connectionManager.getPool(id);
      expect(pool).toBeDefined();
      expect(pool.query).toBeDefined();
    });

    it('should throw for an unknown connection ID', () => {
      expect(() => connectionManager.getPool('conn_nonexistent')).toThrow('Connection not found');
    });
  });

  describe('disconnect', () => {
    it('should end the pool and remove the connection', async () => {
      const id = await connectionManager.connect('postgresql://test@localhost/testdb');
      await connectionManager.disconnect(id);
      expect(mockEnd).toHaveBeenCalled();
      expect(() => connectionManager.getPool(id)).toThrow('Connection not found');
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
