import type { TableInfo } from '@/types/schema';
import { cn } from '@/lib/cn';

interface TableDetailProps {
  table: TableInfo;
}

export function TableDetail({ table }: TableDetailProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">Columns</h3>
        <div className="mt-2 rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Nullable</th>
                <th className="px-3 py-2 text-left font-medium">Default</th>
              </tr>
            </thead>
            <tbody>
              {table.columns.map((col) => (
                <tr key={col.name} className="border-b last:border-b-0">
                  <td className="px-3 py-1.5">
                    <span className={cn(col.isPrimaryKey && 'font-bold')}>
                      {col.name}
                      {col.isPrimaryKey && (
                        <span className="ml-1 text-xs text-muted-foreground">PK</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs">{col.udtName}</td>
                  <td className="px-3 py-1.5">{col.isNullable ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">
                    {col.columnDefault ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {table.foreignKeys.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Foreign Keys</h3>
          <div className="mt-2 space-y-1">
            {table.foreignKeys.map((fk) => (
              <div key={fk.constraintName} className="rounded border px-3 py-2 text-sm">
                <span className="font-medium">{fk.columnName}</span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-medium">{fk.referencedTable}</span>
                <span className="text-muted-foreground">.{fk.referencedColumn}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {table.indexes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Indexes</h3>
          <div className="mt-2 space-y-1">
            {table.indexes.map((idx) => (
              <div
                key={idx.name}
                className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
              >
                <span className="font-medium">{idx.name}</span>
                {idx.isUnique && (
                  <span className="rounded bg-primary/10 px-1 py-0.5 text-xs font-medium text-primary">
                    UNIQUE
                  </span>
                )}
                <span className="text-muted-foreground">({idx.columns.join(', ')})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
