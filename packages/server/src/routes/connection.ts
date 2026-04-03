import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as connectionManager from '../services/connection-manager.js';

const ConnectBody = z.object({
  connectionString: z.string().min(1, 'Connection string is required'),
});

const DisconnectParams = z.object({
  id: z.string(),
});

export async function connectionRoutes(app: FastifyInstance) {
  app.post('/api/connections', async (request, reply) => {
    const parsed = ConnectBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    try {
      const id = await connectionManager.connect(parsed.data.connectionString);
      return reply.status(201).send({ id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      return reply.status(400).send({ error: message });
    }
  });

  app.get('/api/connections', async () => {
    return connectionManager.listConnections();
  });

  app.delete('/api/connections/:id', async (request, reply) => {
    const parsed = DisconnectParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid connection ID' });
    }
    await connectionManager.disconnect(parsed.data.id);
    return reply.status(204).send();
  });
}
