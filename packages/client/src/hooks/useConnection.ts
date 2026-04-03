import { useState, useCallback } from 'react';
import * as api from '@/lib/api';
import { saveConnection } from '@/lib/saved-connections';
import type { SchemaOverview } from '@/types/schema';

interface ConnectionState {
  connectionId: string | null;
  schema: SchemaOverview | null;
  isConnecting: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useConnection() {
  const [state, setState] = useState<ConnectionState>({
    connectionId: null,
    schema: null,
    isConnecting: false,
    isLoading: false,
    error: null,
  });

  const connectAndLoad = useCallback(async (connectionString: string) => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const { id } = await api.connect(connectionString);
      saveConnection(connectionString);
      setState((s) => ({ ...s, connectionId: id, isConnecting: false, isLoading: true }));
      const schema = await api.getSchema(id);
      setState((s) => ({ ...s, schema, isLoading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setState((s) => ({
        ...s,
        isConnecting: false,
        isLoading: false,
        error: message,
      }));
    }
  }, []);

  const disconnectFromDb = useCallback(async () => {
    if (state.connectionId) {
      await api.disconnect(state.connectionId).catch(() => {});
    }
    setState({
      connectionId: null,
      schema: null,
      isConnecting: false,
      isLoading: false,
      error: null,
    });
  }, [state.connectionId]);

  const refreshSchema = useCallback(async () => {
    if (!state.connectionId) return;
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const schema = await api.getSchema(state.connectionId);
      setState((s) => ({ ...s, schema, isLoading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh';
      setState((s) => ({ ...s, isLoading: false, error: message }));
    }
  }, [state.connectionId]);

  return {
    ...state,
    connectAndLoad,
    disconnect: disconnectFromDb,
    refreshSchema,
  };
}
