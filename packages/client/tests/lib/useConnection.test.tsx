import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConnection } from '@/hooks/useConnection';
import * as api from '@/lib/api';
import { saveConnection } from '@/lib/saved-connections';
import type { SchemaOverview } from '@/types/schema';

vi.mock('@/lib/api', () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  getSchema: vi.fn(),
}));

vi.mock('@/lib/saved-connections', () => ({
  saveConnection: vi.fn(),
}));

const schema: SchemaOverview = {
  tables: [],
  timestamp: '2026-01-01T00:00:00.000Z',
};

describe('useConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects, saves the connection, and loads its schema', async () => {
    vi.mocked(api.connect).mockResolvedValue({ id: 'conn-1' });
    vi.mocked(api.getSchema).mockResolvedValue(schema);
    const { result } = renderHook(() => useConnection());

    await act(async () => {
      await result.current.connectAndLoad('postgresql://user:pass@host/db');
    });

    expect(api.connect).toHaveBeenCalledWith('postgresql://user:pass@host/db');
    expect(saveConnection).toHaveBeenCalledWith('postgresql://user:pass@host/db');
    expect(api.getSchema).toHaveBeenCalledWith('conn-1');
    expect(result.current).toMatchObject({
      connectionId: 'conn-1',
      schema,
      isConnecting: false,
      isLoading: false,
      error: null,
    });
  });

  it('does not save a failed connection and exposes the server error', async () => {
    vi.mocked(api.connect).mockRejectedValue(new Error('authentication failed'));
    const { result } = renderHook(() => useConnection());

    await act(async () => {
      await result.current.connectAndLoad('postgresql://bad');
    });

    expect(saveConnection).not.toHaveBeenCalled();
    expect(api.getSchema).not.toHaveBeenCalled();
    expect(result.current.error).toBe('authentication failed');
    expect(result.current.connectionId).toBeNull();
  });

  it('uses a safe fallback for non-Error connection failures', async () => {
    vi.mocked(api.connect).mockRejectedValue('network failure');
    const { result } = renderHook(() => useConnection());

    await act(async () => {
      await result.current.connectAndLoad('postgresql://bad');
    });

    expect(result.current.error).toBe('Connection failed');
  });

  it('disconnects remotely and resets local state even if the request fails', async () => {
    vi.mocked(api.connect).mockResolvedValue({ id: 'conn-1' });
    vi.mocked(api.getSchema).mockResolvedValue(schema);
    vi.mocked(api.disconnect).mockRejectedValue(new Error('already closed'));
    const { result } = renderHook(() => useConnection());

    await act(async () => {
      await result.current.connectAndLoad('postgresql://host/db');
    });
    await act(async () => {
      await result.current.disconnect();
    });

    expect(api.disconnect).toHaveBeenCalledWith('conn-1');
    expect(result.current).toMatchObject({
      connectionId: null,
      schema: null,
      isConnecting: false,
      isLoading: false,
      error: null,
    });
  });

  it('refreshes an active schema and reports refresh failures', async () => {
    const refreshed = { ...schema, timestamp: '2026-02-01T00:00:00.000Z' };
    vi.mocked(api.connect).mockResolvedValue({ id: 'conn-1' });
    vi.mocked(api.getSchema).mockResolvedValueOnce(schema).mockResolvedValueOnce(refreshed);
    const { result } = renderHook(() => useConnection());

    await act(async () => {
      await result.current.connectAndLoad('postgresql://host/db');
    });
    await act(async () => {
      await result.current.refreshSchema();
    });
    expect(result.current.schema).toEqual(refreshed);

    vi.mocked(api.getSchema).mockRejectedValueOnce(new Error('refresh unavailable'));
    await act(async () => {
      await result.current.refreshSchema();
    });
    expect(result.current.error).toBe('refresh unavailable');
    expect(result.current.isLoading).toBe(false);
  });

  it('does not request a schema when no connection is active', async () => {
    const { result } = renderHook(() => useConnection());

    await act(async () => {
      await result.current.refreshSchema();
      await result.current.disconnect();
    });

    expect(api.getSchema).not.toHaveBeenCalled();
    expect(api.disconnect).not.toHaveBeenCalled();
  });
});
