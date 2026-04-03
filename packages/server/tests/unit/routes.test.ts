import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';

// Mock connection manager
vi.mock('../../src/services/connection-manager.js', () => ({
  connect: vi.fn().mockResolvedValue('conn_test_123'),
  disconnect: vi.fn().mockResolvedValue(undefined),
  disconnectAll: vi.fn().mockResolvedValue(undefined),
  getPool: vi.fn().mockReturnValue({
    query: vi.fn().mockResolvedValue({ rows: [] }),
  }),
  listConnections: vi.fn().mockReturnValue([
    { id: 'conn_test_123', connectedAt: new Date(), lastUsed: new Date() },
  ]),
}));

// Mock schema introspector
vi.mock('../../src/services/schema-introspector.js', () => ({
  introspectSchema: vi.fn().mockResolvedValue({
    tables: [{ name: 'users', schema: 'public', columns: [], rowCount: 10 }],
    timestamp: new Date().toISOString(),
  }),
  introspectTable: vi.fn().mockResolvedValue({
    name: 'users',
    schema: 'public',
    columns: [],
    rowCount: 10,
    primaryKeys: [],
    foreignKeys: [],
    indexes: [],
  }),
}));

// Mock data query
vi.mock('../../src/services/data-query.js', () => ({
  queryTableData: vi.fn().mockResolvedValue({
    rows: [{ id: 1, name: 'test' }],
    totalRows: 1,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  }),
}));

describe('API Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('should return ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload)).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/connections', () => {
    it('should create a connection and return ID', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/connections',
        payload: { connectionString: 'postgresql://test@localhost/testdb' },
      });
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.payload)).toEqual({ id: 'conn_test_123' });
    });

    it('should return 400 for missing connection string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/connections',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for empty connection string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/connections',
        payload: { connectionString: '' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/connections', () => {
    it('should list active connections', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/connections' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe('conn_test_123');
    });
  });

  describe('DELETE /api/connections/:id', () => {
    it('should disconnect and return 204', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/connections/conn_test_123',
      });
      expect(res.statusCode).toBe(204);
    });
  });

  describe('GET /api/connections/:connectionId/schema', () => {
    it('should return schema overview', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/connections/conn_test_123/schema',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.tables).toBeDefined();
    });
  });

  describe('GET /api/connections/:connectionId/tables/:tableName', () => {
    it('should return table info', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/connections/conn_test_123/tables/users',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.name).toBe('users');
    });
  });

  describe('GET /api/connections/:connectionId/tables/:tableName/data', () => {
    it('should return paginated table data', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/connections/conn_test_123/tables/users/data',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.rows).toBeDefined();
      expect(body.totalRows).toBe(1);
    });

    it('should accept pagination query params', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/connections/conn_test_123/tables/users/data?page=2&pageSize=25',
      });
      expect(res.statusCode).toBe(200);
    });
  });
});
