import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as connectionManager from '../services/connection-manager.js';
import { queryTableData } from '../services/data-query.js';

const DataParams = z.object({
  connectionId: z.string(),
  tableName: z.string(),
});

const DataQuery = z.object({
  schema: z.string().default('public'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(50),
  sortColumn: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  searchColumn: z.string().optional(),
});

export async function dataRoutes(app: FastifyInstance) {
  app.get('/api/connections/:connectionId/tables/:tableName/data', async (request, reply) => {
    const params = DataParams.safeParse(request.params);
    const query = DataQuery.safeParse(request.query);

    if (!params.success) {
      return reply.status(400).send({ error: 'Invalid parameters' });
    }
    if (!query.success) {
      return reply.status(400).send({ error: query.error.issues[0].message });
    }

    try {
      const adapter = connectionManager.getAdapter(params.data.connectionId);
      const data = await queryTableData(adapter, query.data.schema, params.data.tableName, {
        page: query.data.page,
        pageSize: query.data.pageSize,
        sortColumn: query.data.sortColumn,
        sortDirection: query.data.sortDirection,
        search: query.data.search,
        searchColumn: query.data.searchColumn,
      });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to query data';
      const status = message.includes('not found') ? 404 : 500;
      return reply.status(status).send({ error: message });
    }
  });
}
