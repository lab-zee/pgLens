import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/cn';
import {
  getSavedConnections,
  removeSavedConnection,
  maskConnectionString,
  type SavedConnection,
} from '@/lib/saved-connections';

interface ConnectionFormProps {
  onConnect: (connectionString: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export function ConnectionForm({ onConnect, isConnecting, error }: ConnectionFormProps) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState<SavedConnection[]>(() => getSavedConnections());

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConnect(value.trim());
    }
  };

  const handleConnectSaved = (conn: SavedConnection) => {
    onConnect(conn.connectionString);
  };

  const handleSelectSaved = (conn: SavedConnection) => {
    setValue(conn.connectionString);
  };

  const handleRemoveSaved = (conn: SavedConnection) => {
    removeSavedConnection(conn.connectionString);
    setSaved(getSavedConnections());
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-xl space-y-8">
          {/* Branding */}
          <div className="space-y-3 text-center">
            <h1 className="text-4xl font-bold tracking-tight">pgLens</h1>
            <p className="text-lg text-muted-foreground">
              See your Postgres clearly.
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Connect to any PostgreSQL database and instantly explore tables, schemas,
              relationships, and data — with type-aware UI that adapts to your columns.
            </p>
          </div>

          {/* Connect form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="connection-string" className="text-sm font-medium">
                Connection String
              </label>
              <input
                id="connection-string"
                type="text"
                placeholder="postgresql://user:password@host:5432/dbname"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={isConnecting}
                className={cn(
                  'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isConnecting || !value.trim()}
              className={cn(
                'inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2',
                'text-sm font-medium text-primary-foreground',
                'hover:bg-primary/90',
                'disabled:pointer-events-none disabled:opacity-50',
                'transition-colors',
              )}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          </form>

          {/* Saved connections */}
          {saved.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Recent connections</h2>
              <div className="space-y-1">
                {saved.map((conn) => (
                  <div
                    key={conn.connectionString}
                    className="group flex items-center gap-2 rounded-md border border-border p-2.5 text-sm"
                  >
                    <button
                      onClick={() => handleConnectSaved(conn)}
                      disabled={isConnecting}
                      className="flex-1 text-left min-w-0 disabled:opacity-50"
                    >
                      <div className="font-medium truncate">{conn.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {maskConnectionString(conn.connectionString)}
                      </div>
                    </button>
                    <button
                      onClick={() => handleSelectSaved(conn)}
                      disabled={isConnecting}
                      className="shrink-0 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                      title="Copy to input"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveSaved(conn)}
                      className="shrink-0 rounded px-2 py-1 text-xs text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
                      title="Remove saved connection"
                      aria-label={`Remove ${conn.label}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What you get */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border border-border p-3 space-y-1">
              <div className="font-medium">Schema Discovery</div>
              <div className="text-xs text-muted-foreground">
                Tables, columns, types, PKs, FKs, indexes — all auto-detected.
              </div>
            </div>
            <div className="rounded-md border border-border p-3 space-y-1">
              <div className="font-medium">Smart UI</div>
              <div className="text-xs text-muted-foreground">
                Booleans, JSON, dates, UUIDs, emails — each type gets the right widget.
              </div>
            </div>
            <div className="rounded-md border border-border p-3 space-y-1">
              <div className="font-medium">Relationship Map</div>
              <div className="text-xs text-muted-foreground">
                See how tables connect via foreign keys in an interactive graph.
              </div>
            </div>
            <div className="rounded-md border border-border p-3 space-y-1">
              <div className="font-medium">Search & Browse</div>
              <div className="text-xs text-muted-foreground">
                Full-text search, pagination, sorting — explore tables of any size.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="text-center sm:text-left space-y-0.5">
            <p>
              pgLens is open source and free to use.
              We encourage you to run it locally, self-host, fork, and contribute.
            </p>
            <p>
              Your data and connection strings are never persisted server-side, logged, or sent to third parties.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
