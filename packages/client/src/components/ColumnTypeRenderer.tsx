import { cn } from '@/lib/cn';

interface CellRendererProps {
  value: unknown;
  udtName: string;
}

export function CellRenderer({ value, udtName }: CellRendererProps) {
  if (value === null || value === undefined) {
    return <span className="italic text-muted-foreground">NULL</span>;
  }

  // Boolean
  if (udtName === 'bool') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
        )}
      >
        {value ? 'true' : 'false'}
      </span>
    );
  }

  // JSON / JSONB
  if (udtName === 'json' || udtName === 'jsonb') {
    const formatted = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return (
      <pre className="max-h-32 max-w-xs overflow-auto rounded bg-muted p-1 text-xs">
        {formatted}
      </pre>
    );
  }

  // Timestamps
  if (udtName === 'timestamp' || udtName === 'timestamptz') {
    const date = new Date(value as string);
    if (!isNaN(date.getTime())) {
      return <span>{date.toLocaleString()}</span>;
    }
  }

  // Date
  if (udtName === 'date') {
    const date = new Date(value as string);
    if (!isNaN(date.getTime())) {
      return <span>{date.toLocaleDateString()}</span>;
    }
  }

  // UUID — truncate for display
  if (udtName === 'uuid') {
    const str = String(value);
    return <span className="font-mono text-xs" title={str}>{str.slice(0, 8)}...</span>;
  }

  // Arrays
  if (Array.isArray(value)) {
    return (
      <span className="text-xs">
        [{value.map((v) => JSON.stringify(v)).join(', ')}]
      </span>
    );
  }

  // Numeric types — right-align
  if (['int2', 'int4', 'int8', 'float4', 'float8', 'numeric', 'money'].includes(udtName)) {
    return <span className="tabular-nums">{String(value)}</span>;
  }

  // Text — truncate long strings
  const str = String(value);
  if (str.length > 100) {
    return <span title={str}>{str.slice(0, 100)}...</span>;
  }

  return <span>{str}</span>;
}
