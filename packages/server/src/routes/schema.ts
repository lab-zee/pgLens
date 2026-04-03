import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as connectionManager from '../services/connection-manager.js';
import { introspectSchema, introspectTable } from '../services/schema-introspector.js';

const ConnectionParams = z.object({
  connectionId: z.string(),
});

const TableParams = z.object({
  connectionId: z.string(),
  tableName: z.string(),
});

const SchemaQuery = z.object({
  schema: z.string().default('public'),
});

export async function schemaRoutes(app: FastifyInstance) {
  app.get('/api/connections/:connectionId/schema', async (request, reply) => {
    const params = ConnectionParams.safeParse(request.params);
    const query = SchemaQuery.safeParse(request.query);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid connection ID' });
    }
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters' });
    }

    try {
      const pool = connectionManager.getPool(params.data.connectionId);
      const schema = await introspectSchema(pool, query.data.schema);
      return schema;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to introspect schema';
      const status = message.includes('not found') ? 404 : 500;
      return reply.status(status).send({ error: message });
    }
  });

  app.get('/api/connections/:connectionId/tables/:tableName', async (request, reply) => {
    const params = TableParams.safeParse(request.params);
    const query = SchemaQuery.safeParse(request.query);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid parameters' });
    }
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters' });
    }

    try {
      const pool = connectionManager.getPool(params.data.connectionId);
      const table = await introspectTable(pool, query.data.schema, params.data.tableName);
      return table;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to introspect table';
      const status = message.includes('not found') ? 404 : 500;
      return reply.status(status).send({ error: message });
    }
  });
}
