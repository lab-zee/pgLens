import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dashboard } from '@/components/Dashboard';
import type { SchemaOverview, TableInfo } from '@/types/schema';

vi.mock('@/components/TableCard', () => ({
  TableCard: ({
    table,
    isSelected,
    onClick,
  }: {
    table: TableInfo;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <button aria-pressed={isSelected} onClick={onClick}>
      card {table.name}
    </button>
  ),
}));

vi.mock('@/components/TableDetail', () => ({
  TableDetail: ({ table }: { table: TableInfo }) => <div>detail {table.name}</div>,
}));

vi.mock('@/components/DataGrid', () => ({
  DataGrid: ({ connectionId, table }: { connectionId: string; table: TableInfo }) => (
    <div>
      grid {connectionId} {table.name}
    </div>
  ),
}));

vi.mock('@/components/RecordView', () => ({
  RecordView: ({ connectionId, table }: { connectionId: string; table: TableInfo }) => (
    <div>
      records {connectionId} {table.name}
    </div>
  ),
}));

vi.mock('@/components/RelationshipGraph', () => ({
  RelationshipGraph: ({ onSelectTable }: { onSelectTable: (name: string) => void }) => (
    <div>
      <button onClick={() => onSelectTable('posts')}>graph posts</button>
      <button onClick={() => onSelectTable('missing')}>graph missing</button>
    </div>
  ),
}));

function table(name: string): TableInfo {
  return {
    name,
    schema: 'public',
    rowCount: 2,
    columns: [],
    primaryKeys: [],
    foreignKeys: [],
    indexes: [],
  };
}

const schema: SchemaOverview = {
  tables: [table('users'), table('posts')],
  timestamp: '2026-01-01T00:00:00.000Z',
};

describe('Dashboard', () => {
  it('selects tables and switches among schema, record, and data views', async () => {
    const user = userEvent.setup();
    render(
      <Dashboard
        connectionId="conn-1"
        schema={schema}
        onDisconnect={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={false}
      />,
    );

    expect(screen.getByText('2 tables found')).toBeInTheDocument();
    expect(screen.getByText('Select a table to explore')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'card users' }));
    expect(screen.getByText('detail users')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'card users' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'records' }));
    expect(screen.getByText('records conn-1 users')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'data' }));
    expect(screen.getByText('grid conn-1 users')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'schema' }));
    expect(screen.getByText('detail users')).toBeInTheDocument();
  });

  it('selects a table from the relationship graph and ignores unknown names', async () => {
    const user = userEvent.setup();
    render(
      <Dashboard
        connectionId="conn-1"
        schema={schema}
        onDisconnect={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'graph missing' }));
    expect(screen.getByText('Select a table to explore')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'graph posts' }));
    expect(screen.getByText('detail posts')).toBeInTheDocument();
  });

  it('wires refresh and disconnect controls and disables refresh while loading', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    const onDisconnect = vi.fn();
    render(
      <Dashboard
        connectionId="conn-1"
        schema={schema}
        onDisconnect={onDisconnect}
        onRefresh={onRefresh}
        isLoading
      />,
    );

    expect(screen.getByRole('button', { name: 'Refreshing...' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onDisconnect).toHaveBeenCalledOnce();
  });
});
