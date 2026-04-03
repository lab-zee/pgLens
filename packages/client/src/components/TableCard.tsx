import type { TableInfo } from '@/types/schema';
import { cn } from '@/lib/cn';

interface TableCardProps {
  table: TableInfo;
  isSelected: boolean;
  onClick: () => void;
}

export function TableCard({ table, isSelected, onClick }: TableCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-colors',
        'hover:bg-accent',
        isSelected ? 'border-primary bg-accent' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{table.name}</h3>
        <span className="text-xs text-muted-foreground">
          {table.rowCount.toLocaleString()} rows
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {table.columns.slice(0, 6).map((col) => (
          <span
            key={col.name}
            className={cn(
              'inline-flex items-center rounded px-1.5 py-0.5 text-xs',
              col.isPrimaryKey
                ? 'bg-primary/10 text-primary font-medium'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {col.name}
          </span>
        ))}
        {table.columns.length > 6 && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs text-muted-foreground">
            +{table.columns.length - 6} more
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
        <span>{table.columns.length} columns</span>
        {table.foreignKeys.length > 0 && <span>{table.foreignKeys.length} FK</span>}
        {table.indexes.length > 0 && <span>{table.indexes.length} indexes</span>}
      </div>
    </button>
  );
}
