import type { SchemaOverview, TableDataPage } from '@/types/schema';

const BASE = '/api';

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

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
  return request(`/connections/${pathSegment(connectionId)}`, { method: 'DELETE' });
}

export async function getSchema(connectionId: string, schema = 'public'): Promise<SchemaOverview> {
  const params = new URLSearchParams({ schema });
  return request(`/connections/${pathSegment(connectionId)}/schema?${params}`);
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
  if (options.page !== undefined) params.set('page', String(options.page));
  if (options.pageSize !== undefined) params.set('pageSize', String(options.pageSize));
  if (options.sortColumn) params.set('sortColumn', options.sortColumn);
  if (options.sortDirection) params.set('sortDirection', options.sortDirection);
  if (options.search) params.set('search', options.search);
  if (options.searchColumn) params.set('searchColumn', options.searchColumn);
  const query = params.toString();
  const path = `/connections/${pathSegment(connectionId)}/tables/${pathSegment(tableName)}/data`;
  return request(query ? `${path}?${query}` : path);
}
