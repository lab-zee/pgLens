import pg from 'pg';
import type { DatabaseAdapter } from './database-adapter.js';
import { PostgresAdapter } from './postgres-adapter.js';
import { SqliteAdapter } from './sqlite-adapter.js';

const { Pool } = pg;

export type ConnectionId = string;

interface ManagedConnection {
  adapter: DatabaseAdapter;
  connectedAt: Date;
  lastUsed: Date;
}

const connections = new Map<ConnectionId, ManagedConnection>();

let idCounter = 0;

function generateId(): ConnectionId {
  return `conn_${++idCounter}_${Date.now()}`;
}

/** Detect whether a connection string targets SQLite or PostgreSQL */
export function detectDialect(connectionString: string): 'sqlite' | 'postgres' {
  const s = connectionString.trim();
  if (s.startsWith('sqlite:')) return 'sqlite';
  if (/\.(db|sqlite|sqlite3)$/i.test(s)) return 'sqlite';
  if (s === ':memory:') return 'sqlite';
  return 'postgres';
}

export async function connect(connectionString: string): Promise<ConnectionId> {
  const dialect = detectDialect(connectionString);
  let adapter: DatabaseAdapter;

  if (dialect === 'sqlite') {
    const filePath = connectionString.startsWith('sqlite:')
      ? connectionString.slice('sqlite:'.length)
      : connectionString;
    adapter = new SqliteAdapter(filePath);
    // Verify by listing tables (will throw if file doesn't exist / is invalid)
    await adapter.getTables('main');
  } else {
    const pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });

    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }

    adapter = new PostgresAdapter(pool);
  }

  const id = generateId();
  connections.set(id, {
    adapter,
    connectedAt: new Date(),
    lastUsed: new Date(),
  });

  return id;
}

export function getAdapter(id: ConnectionId): DatabaseAdapter {
  const conn = connections.get(id);
  if (!conn) {
    throw new Error(`Connection not found: ${id}`);
  }
  conn.lastUsed = new Date();
  return conn.adapter;
}

/** @deprecated Use getAdapter() instead */
export function getPool(id: ConnectionId): pg.Pool {
  const conn = connections.get(id);
  if (!conn) {
    throw new Error(`Connection not found: ${id}`);
  }
  if (conn.adapter.dialect !== 'postgres') {
    throw new Error('getPool() is only available for PostgreSQL connections');
  }
  conn.lastUsed = new Date();
  // Access the internal pool — this is a bridge for migration
  return (conn.adapter as PostgresAdapter).pool;
}

export async function disconnect(id: ConnectionId): Promise<void> {
  const conn = connections.get(id);
  if (!conn) return;
  await conn.adapter.close();
  connections.delete(id);
}

export async function disconnectAll(): Promise<void> {
  const promises = Array.from(connections.keys()).map(disconnect);
  await Promise.all(promises);
}

export function listConnections(): { id: ConnectionId; connectedAt: Date; lastUsed: Date }[] {
  return Array.from(connections.entries()).map(([id, conn]) => ({
    id,
    connectedAt: conn.connectedAt,
    lastUsed: conn.lastUsed,
  }));
}
