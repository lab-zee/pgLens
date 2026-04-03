import { useConnection } from '@/hooks/useConnection';
import { ConnectionForm } from '@/components/ConnectionForm';
import { Dashboard } from '@/components/Dashboard';

export function App() {
  const { connectionId, schema, isConnecting, isLoading, error, connectAndLoad, disconnect, refreshSchema } =
    useConnection();

  if (!connectionId || !schema) {
    return (
      <ConnectionForm onConnect={connectAndLoad} isConnecting={isConnecting || isLoading} error={error} />
    );
  }

  return (
    <Dashboard
      connectionId={connectionId}
      schema={schema}
      onDisconnect={disconnect}
      onRefresh={refreshSchema}
      isLoading={isLoading}
    />
  );
}
