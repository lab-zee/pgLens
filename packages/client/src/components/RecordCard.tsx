import type { ColumnInfo, TableInfo } from '@/types/schema';
import { FieldWidget } from '@/components/FieldWidget';
import { cn } from '@/lib/cn';

interface RecordCardProps {
  row: Record<string, unknown>;
  columns: ColumnInfo[];
  table: TableInfo;
}

export function RecordCard({ row, columns, table }: RecordCardProps) {
  // Find a display label for the card header — use first text-like non-PK column, or PK
  const labelCol =
    columns.find(
      (c) =>
        !c.isPrimaryKey &&
        ['varchar', 'text', 'name', 'citext'].includes(c.udtName) &&
        row[c.name] != null,
    ) ?? columns.find((c) => c.isPrimaryKey);

  const pkCols = columns.filter((c) => c.isPrimaryKey);
  const pkLabel = pkCols.map((c) => `${c.name}: ${formatCompact(row[c.name])}`).join(', ');

  const label = labelCol && !labelCol.isPrimaryKey ? String(row[labelCol.name] ?? '') : '';

  // Group: PKs first, then FKs, then the rest
  const fkColNames = new Set(table.foreignKeys.map((fk) => fk.columnName));
  const sortedColumns = [
    ...columns.filter((c) => c.isPrimaryKey),
    ...columns.filter((c) => !c.isPrimaryKey && fkColNames.has(c.name)),
    ...columns.filter((c) => !c.isPrimaryKey && !fkColNames.has(c.name)),
  ];

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Card header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold truncate max-w-[70%]">{label || pkLabel}</span>
          <span className="text-xs font-mono text-muted-foreground">{pkLabel}</span>
        </div>
      </div>

      {/* Fields */}
      <div className="divide-y divide-border">
        {sortedColumns.map((col) => (
          <div key={col.name} className="flex px-4 py-2.5">
            <div className="w-36 shrink-0 pr-3">
              <span
                className={cn(
                  'text-xs',
                  col.isPrimaryKey ? 'font-bold text-foreground' : 'text-muted-foreground',
                )}
              >
                {col.name}
              </span>
              {col.isPrimaryKey && (
                <span className="ml-1 rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary">
                  PK
                </span>
              )}
              {fkColNames.has(col.name) && (
                <span className="ml-1 rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-700">
                  FK
                </span>
              )}
              <div className="text-[10px] text-muted-foreground">{col.udtName}</div>
            </div>
            <div className="flex-1 min-w-0">
              <FieldWidget value={row[col.name]} column={col} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCompact(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  const s = String(value);
  return s.length > 20 ? s.slice(0, 20) + '...' : s;
}
