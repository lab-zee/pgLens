import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/lib/api';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('API client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('connects with JSON headers and the supplied connection string', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'conn-1' }));

    await expect(api.connect('postgresql://user:pass@host/db')).resolves.toEqual({
      id: 'conn-1',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/connections', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ connectionString: 'postgresql://user:pass@host/db' }),
    });
  });

  it('handles empty successful responses when disconnecting', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api.disconnect('connection/with spaces')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/connections/connection%2Fwith%20spaces', {
      headers: { 'Content-Type': 'application/json' },
      method: 'DELETE',
    });
  });

  it('encodes schema and connection identifiers', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ tables: [], timestamp: '2026-01-01T00:00:00Z' }));

    await api.getSchema('connection/1', 'tenant schema');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/connections/connection%2F1/schema?schema=tenant+schema',
      { headers: { 'Content-Type': 'application/json' } },
    );
  });

  it('builds a complete table-data query without losing numeric zero values', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ rows: [], totalRows: 0, page: 1, pageSize: 50, totalPages: 0 }),
    );

    await api.getTableData('conn/1', 'order items', {
      schema: 'sales data',
      page: 0,
      pageSize: 0,
      sortColumn: 'created at',
      sortDirection: 'desc',
      search: 'open & ready',
      searchColumn: 'status/type',
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url, 'http://localhost');
    expect(parsed.pathname).toBe('/api/connections/conn%2F1/tables/order%20items/data');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      schema: 'sales data',
      page: '0',
      pageSize: '0',
      sortColumn: 'created at',
      sortDirection: 'desc',
      search: 'open & ready',
      searchColumn: 'status/type',
    });
  });

  it('omits the query delimiter when no table-data options are supplied', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ rows: [], totalRows: 0, page: 1, pageSize: 50, totalPages: 0 }),
    );

    await api.getTableData('conn-1', 'users');

    expect(fetchMock).toHaveBeenCalledWith('/api/connections/conn-1/tables/users/data', {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('surfaces API error messages', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Connection refused' }, { status: 400 }));

    await expect(api.connect('bad')).rejects.toThrow('Connection refused');
  });

  it('falls back to the HTTP status when an error response is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('upstream failure', { status: 502 }));

    await expect(api.getSchema('conn-1')).rejects.toThrow('Request failed: 502');
  });
});
