import { useState } from 'react';
import type { ColumnInfo } from '@/types/schema';
import { cn } from '@/lib/cn';

interface FieldWidgetProps {
  value: unknown;
  column: ColumnInfo;
}

/**
 * Renders a value as an appropriate UI widget based on the column type and name.
 * This is the core of the "infer UI from schema" idea — deterministic widget
 * selection driven entirely by column metadata and data shape.
 */
export function FieldWidget({ value, column }: FieldWidgetProps) {
  if (value === null || value === undefined) {
    return <NullBadge />;
  }

  const { udtName, name: colName } = column;

  // Boolean → toggle display
  if (udtName === 'bool') {
    return <BooleanWidget value={Boolean(value)} />;
  }

  // JSON/JSONB → collapsible tree
  if (udtName === 'json' || udtName === 'jsonb') {
    return <JsonWidget value={value} />;
  }

  // Timestamp/Timestamptz → date+time with relative
  if (udtName === 'timestamp' || udtName === 'timestamptz') {
    return <TimestampWidget value={value} />;
  }

  // Date → date display
  if (udtName === 'date') {
    return <DateWidget value={value} />;
  }

  // UUID → monospace with copy
  if (udtName === 'uuid') {
    return <UuidWidget value={String(value)} />;
  }

  // Numeric types → formatted number
  if (['int2', 'int4', 'int8', 'float4', 'float8', 'numeric', 'money'].includes(udtName)) {
    return <NumberWidget value={value} udtName={udtName} />;
  }

  // Arrays
  if (Array.isArray(value)) {
    return <ArrayWidget value={value} />;
  }

  // Text/varchar — detect patterns by column name
  const str = String(value);

  // Email detection (by name or content)
  if (looksLikeEmail(colName, str)) {
    return <EmailWidget value={str} />;
  }

  // URL detection (by name or content)
  if (looksLikeUrl(colName, str)) {
    return <UrlWidget value={str} />;
  }

  // Color hex detection
  if (/^#[0-9a-fA-F]{6}$/.test(str)) {
    return <ColorWidget value={str} />;
  }

  // Long text → expandable
  if (str.length > 80) {
    return <LongTextWidget value={str} />;
  }

  // Default text
  return <span className="text-sm">{str}</span>;
}

// ─── Individual Widgets ───

function NullBadge() {
  return (
    <span className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs italic text-muted-foreground">
      NULL
    </span>
  );
}

function BooleanWidget({ value }: { value: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'h-5 w-9 rounded-full transition-colors relative',
          value ? 'bg-green-500' : 'bg-gray-300',
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            value ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </div>
      <span className={cn('text-sm font-medium', value ? 'text-green-700' : 'text-gray-500')}>
        {value ? 'Yes' : 'No'}
      </span>
    </div>
  );
}

function JsonWidget({ value }: { value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const formatted = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  const preview = typeof value === 'string' ? value : JSON.stringify(value);
  const isLong = formatted.length > 60;

  return (
    <div>
      {!expanded && isLong ? (
        <button onClick={() => setExpanded(true)} className="text-left text-sm">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            {preview.length > 60 ? preview.slice(0, 60) + '...' : preview}
          </code>
          <span className="ml-1 text-xs text-blue-600 hover:underline">expand</span>
        </button>
      ) : (
        <div>
          <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
            {formatted}
          </pre>
          {isLong && (
            <button
              onClick={() => setExpanded(false)}
              className="mt-1 text-xs text-blue-600 hover:underline"
            >
              collapse
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TimestampWidget({ value }: { value: unknown }) {
  const date = new Date(value as string);
  if (isNaN(date.getTime())) return <span className="text-sm">{String(value)}</span>;

  const relative = getRelativeTime(date);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{date.toLocaleDateString()}</span>
      <span className="text-xs text-muted-foreground">{date.toLocaleTimeString()}</span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {relative}
      </span>
    </div>
  );
}

function DateWidget({ value }: { value: unknown }) {
  const date = new Date(value as string);
  if (isNaN(date.getTime())) return <span className="text-sm">{String(value)}</span>;

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
    </span>
  );
}

function UuidWidget({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button onClick={copy} className="group flex items-center gap-1.5" title="Click to copy">
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{value}</code>
      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? 'copied!' : 'copy'}
      </span>
    </button>
  );
}

function NumberWidget({ value, udtName }: { value: unknown; udtName: string }) {
  const num = Number(value);
  const isFloat = ['float4', 'float8', 'numeric', 'money'].includes(udtName);
  const formatted =
    udtName === 'money'
      ? num.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
      : isFloat
        ? num.toLocaleString(undefined, { maximumFractionDigits: 6 })
        : num.toLocaleString();

  return <span className="text-sm font-mono tabular-nums">{formatted}</span>;
}

function ArrayWidget({ value }: { value: unknown[] }) {
  if (value.length === 0) {
    return <span className="text-xs text-muted-foreground italic">empty array</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {value.map((item, i) => (
        <span key={i} className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs">
          {JSON.stringify(item)}
        </span>
      ))}
    </div>
  );
}

function EmailWidget({ value }: { value: string }) {
  return (
    <a href={`mailto:${value}`} className="text-sm text-blue-600 hover:underline">
      {value}
    </a>
  );
}

function UrlWidget({ value }: { value: string }) {
  return (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:underline break-all"
    >
      {value}
    </a>
  );
}

function ColorWidget({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-5 w-5 rounded border border-border" style={{ backgroundColor: value }} />
      <code className="text-xs font-mono">{value}</code>
    </div>
  );
}

function LongTextWidget({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <p className="text-sm whitespace-pre-wrap">{expanded ? value : value.slice(0, 80) + '...'}</p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-0.5 text-xs text-blue-600 hover:underline"
      >
        {expanded ? 'show less' : `show all (${value.length} chars)`}
      </button>
    </div>
  );
}

// ─── Helpers ───

function looksLikeEmail(colName: string, value: string): boolean {
  if (/email/i.test(colName)) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function looksLikeUrl(colName: string, value: string): boolean {
  if (/url|website|homepage|link/i.test(colName)) return true;
  return /^https?:\/\/.+/.test(value);
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const isFuture = diffMs < 0;

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return isFuture ? `in ${m}m` : `${m}m ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return isFuture ? `in ${h}h` : `${h}h ago`;
  }
  if (diffSec < 2592000) {
    const d = Math.floor(diffSec / 86400);
    return isFuture ? `in ${d}d` : `${d}d ago`;
  }
  const mo = Math.floor(diffSec / 2592000);
  return isFuture ? `in ${mo}mo` : `${mo}mo ago`;
}
