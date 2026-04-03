import { useState } from 'react';
import type { SchemaOverview, TableInfo } from '@/types/schema';
import { TableCard } from '@/components/TableCard';
import { TableDetail } from '@/components/TableDetail';
import { DataGrid } from '@/components/DataGrid';
import { RecordView } from '@/components/RecordView';
import { RelationshipGraph } from '@/components/RelationshipGraph';
import { cn } from '@/lib/cn';

interface DashboardProps {
  connectionId: string;
  schema: SchemaOverview;
  onDisconnect: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

type ViewMode = 'schema' | 'data' | 'records';

export function Dashboard({
  connectionId,
  schema,
  onDisconnect,
  onRefresh,
  isLoading,
}: DashboardProps) {
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('schema');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">pgLens</h1>
            <p className="text-xs text-muted-foreground">
              {schema.tables.length} tables found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="rounded border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={onDisconnect}
              className="rounded border border-destructive/50 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {/* Relationship graph */}
      <RelationshipGraph schema={schema} onSelectTable={(name) => {
        const table = schema.tables.find((t) => t.name === name);
        if (table) {
          setSelectedTable(table);
          setViewMode('schema');
        }
      }} />

      <div className="flex">
        {/* Sidebar — table list */}
        <aside className="w-72 shrink-0 border-r border-border p-4 overflow-y-auto" style={{ height: 'calc(100vh - 57px)' }}>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Tables</h2>
          <div className="space-y-2">
            {schema.tables.map((table) => (
              <TableCard
                key={table.name}
                table={table}
                isSelected={selectedTable?.name === table.name}
                onClick={() => {
                  setSelectedTable(table);
                  setViewMode('schema');
                }}
              />
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto" style={{ height: 'calc(100vh - 57px)' }}>
          {!selectedTable ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a table to explore
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{selectedTable.name}</h2>
                <div className="flex rounded-md border border-border">
                  {(['schema', 'records', 'data'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={cn(
                        'px-3 py-1.5 text-sm capitalize',
                        viewMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {viewMode === 'schema' && <TableDetail table={selectedTable} />}
              {viewMode === 'records' && (
                <RecordView connectionId={connectionId} table={selectedTable} />
              )}
              {viewMode === 'data' && (
                <DataGrid connectionId={connectionId} table={selectedTable} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
