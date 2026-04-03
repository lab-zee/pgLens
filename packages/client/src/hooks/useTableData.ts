import { useState, useCallback } from 'react';
import * as api from '@/lib/api';
import type { TableDataPage } from '@/types/schema';

export function useTableData(connectionId: string | null) {
  const [data, setData] = useState<TableDataPage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (
      tableName: string,
      options: {
        page?: number;
        pageSize?: number;
        sortColumn?: string;
        sortDirection?: 'asc' | 'desc';
        search?: string;
        searchColumn?: string;
      } = {},
    ) => {
      if (!connectionId) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await api.getTableData(connectionId, tableName, options);
        setData(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [connectionId],
  );

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, isLoading, error, loadData, clearData };
}
