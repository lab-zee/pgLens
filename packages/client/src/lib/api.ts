import type { SchemaOverview, TableInfo, TableDataPage } from '@/types/schema';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function connect(connectionString: string): Promise<{ id: string }> {
  return request('/connections', {
    method: 'POST',
    body: JSON.stringify({ connectionString }),
  });
}

export async function disconnect(connectionId: string): Promise<void> {
  return request(`/connections/${connectionId}`, { method: 'DELETE' });
}

export async function getSchema(connectionId: string, schema = 'public'): Promise<SchemaOverview> {
  return request(`/connections/${connectionId}/schema?schema=${schema}`);
}

export async function getTable(
  connectionId: string,
  tableName: string,
  schema = 'public',
): Promise<TableInfo> {
  return request(`/connections/${connectionId}/tables/${tableName}?schema=${schema}`);
}

export async function getTableData(
  connectionId: string,
  tableName: string,
  options: {
    schema?: string;
    page?: number;
    pageSize?: number;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    search?: string;
    searchColumn?: string;
  } = {},
): Promise<TableDataPage> {
  const params = new URLSearchParams();
  if (options.schema) params.set('schema', options.schema);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  if (options.sortColumn) params.set('sortColumn', options.sortColumn);
  if (options.sortDirection) params.set('sortDirection', options.sortDirection);
  if (options.search) params.set('search', options.search);
  if (options.searchColumn) params.set('searchColumn', options.searchColumn);
  return request(`/connections/${connectionId}/tables/${tableName}/data?${params}`);
}
