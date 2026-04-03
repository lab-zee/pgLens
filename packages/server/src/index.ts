import { buildApp } from './app.js';
import { disconnectAll } from './services/connection-manager.js';

async function start() {
  const app = await buildApp();
  const port = parseInt(process.env.PORT ?? '3001', 10);

  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    await disconnectAll();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
