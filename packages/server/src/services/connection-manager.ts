import pg from 'pg';

const { Pool } = pg;

export type ConnectionId = string;

interface ManagedConnection {
  pool: pg.Pool;
  connectedAt: Date;
  lastUsed: Date;
}

const connections = new Map<ConnectionId, ManagedConnection>();

let idCounter = 0;

function generateId(): ConnectionId {
  return `conn_${++idCounter}_${Date.now()}`;
}

export async function connect(connectionString: string): Promise<ConnectionId> {
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // Verify the connection works
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }

  const id = generateId();
  connections.set(id, {
    pool,
    connectedAt: new Date(),
    lastUsed: new Date(),
  });

  return id;
}

export function getPool(id: ConnectionId): pg.Pool {
  const conn = connections.get(id);
  if (!conn) {
    throw new Error(`Connection not found: ${id}`);
  }
  conn.lastUsed = new Date();
  return conn.pool;
}

export async function disconnect(id: ConnectionId): Promise<void> {
  const conn = connections.get(id);
  if (!conn) return;
  await conn.pool.end();
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
