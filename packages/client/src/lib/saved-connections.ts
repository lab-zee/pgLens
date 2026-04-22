const STORAGE_KEY = 'pglens:connections';
const MAX_SAVED = 20;

export interface SavedConnection {
  label: string;
  connectionString: string;
  lastUsed: string;
}

export function getSavedConnections(): SavedConnection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedConnection[];
  } catch {
    return [];
  }
}

export function saveConnection(connectionString: string): void {
  const connections = getSavedConnections();
  // Remove duplicate if exists
  const filtered = connections.filter((c) => c.connectionString !== connectionString);
  const entry: SavedConnection = {
    label: parseLabel(connectionString),
    connectionString,
    lastUsed: new Date().toISOString(),
  };
  // Most recent first, cap at MAX_SAVED
  const updated = [entry, ...filtered].slice(0, MAX_SAVED);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function removeSavedConnection(connectionString: string): void {
  const connections = getSavedConnections();
  const filtered = connections.filter((c) => c.connectionString !== connectionString);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function maskConnectionString(connectionString: string): string {
  if (isSqliteConnection(connectionString)) {
    return connectionString;
  }
  // postgresql://user:password@host:port/dbname → postgresql://user:****@host:port/dbname
  return connectionString.replace(/:([^/:@]+)@/, ':****@');
}

function isSqliteConnection(connectionString: string): boolean {
  const s = connectionString.trim();
  return s.startsWith('sqlite:') || /\.(db|sqlite|sqlite3)$/i.test(s) || s === ':memory:';
}

function parseLabel(connectionString: string): string {
  if (isSqliteConnection(connectionString)) {
    const path = connectionString.startsWith('sqlite:')
      ? connectionString.slice('sqlite:'.length)
      : connectionString;
    if (path === ':memory:') return 'SQLite (in-memory)';
    // Show just the filename
    const parts = path.split('/');
    return `SQLite: ${parts[parts.length - 1]}`;
  }

  try {
    // Handle URL-style PostgreSQL connection strings
    const url = new URL(connectionString);
    const db = url.pathname.replace(/^\//, '') || 'default';
    const host = url.hostname || 'localhost';
    const port = url.port ? `:${url.port}` : '';
    return `${db} @ ${host}${port}`;
  } catch {
    // Fallback: just truncate
    return connectionString.slice(0, 40) + (connectionString.length > 40 ? '...' : '');
  }
}
