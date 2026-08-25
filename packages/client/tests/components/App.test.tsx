import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { useConnection } from '@/hooks/useConnection';

vi.mock('@/hooks/useConnection', () => ({
  useConnection: vi.fn(),
}));

vi.mock('@/components/ConnectionForm', () => ({
  ConnectionForm: ({
    onConnect,
    isConnecting,
    error,
  }: {
    onConnect: (value: string) => void;
    isConnecting: boolean;
    error: string | null;
  }) => (
    <div>
      <span>connection form</span>
      <span>{isConnecting ? 'busy' : 'idle'}</span>
      <span>{error}</span>
      <button onClick={() => onConnect('postgresql://host/db')}>mock connect</button>
    </div>
  ),
}));

vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({
    connectionId,
    onDisconnect,
    onRefresh,
  }: {
    connectionId: string;
    onDisconnect: () => void;
    onRefresh: () => void;
  }) => (
    <div>
      <span>dashboard {connectionId}</span>
      <button onClick={onDisconnect}>mock disconnect</button>
      <button onClick={onRefresh}>mock refresh</button>
    </div>
  ),
}));

function connectionState(overrides: Record<string, unknown> = {}) {
  return {
    connectionId: null,
    schema: null,
    isConnecting: false,
    isLoading: false,
    error: null,
    connectAndLoad: vi.fn(),
    disconnect: vi.fn(),
    refreshSchema: vi.fn(),
    ...overrides,
  };
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the connection form and forwards its loading and error state', async () => {
    const user = userEvent.setup();
    const state = connectionState({
      isLoading: true,
      error: 'schema unavailable',
    });
    vi.mocked(useConnection).mockReturnValue(state);

    render(<App />);

    expect(screen.getByText('connection form')).toBeInTheDocument();
    expect(screen.getByText('busy')).toBeInTheDocument();
    expect(screen.getByText('schema unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'mock connect' }));
    expect(state.connectAndLoad).toHaveBeenCalledWith('postgresql://host/db');
  });

  it('shows the dashboard only after both connection and schema are available', async () => {
    const user = userEvent.setup();
    const state = connectionState({
      connectionId: 'conn-1',
      schema: { tables: [], timestamp: '2026-01-01T00:00:00Z' },
    });
    vi.mocked(useConnection).mockReturnValue(state);

    render(<App />);

    expect(screen.getByText('dashboard conn-1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'mock disconnect' }));
    await user.click(screen.getByRole('button', { name: 'mock refresh' }));
    expect(state.disconnect).toHaveBeenCalledOnce();
    expect(state.refreshSchema).toHaveBeenCalledOnce();
  });
});
