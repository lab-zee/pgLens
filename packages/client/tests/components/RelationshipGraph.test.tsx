import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RelationshipGraph } from '@/components/RelationshipGraph';
import type { SchemaOverview } from '@/types/schema';

const schemaWithFks: SchemaOverview = {
  tables: [
    {
      name: 'users',
      schema: 'public',
      rowCount: 100,
      columns: [
        { name: 'id', dataType: 'integer', udtName: 'int4', isNullable: false, columnDefault: null, isPrimaryKey: true, characterMaxLength: null, numericPrecision: 32 },
      ],
      primaryKeys: ['id'],
      foreignKeys: [],
      indexes: [],
    },
    {
      name: 'posts',
      schema: 'public',
      rowCount: 500,
      columns: [
        { name: 'id', dataType: 'integer', udtName: 'int4', isNullable: false, columnDefault: null, isPrimaryKey: true, characterMaxLength: null, numericPrecision: 32 },
        { name: 'user_id', dataType: 'integer', udtName: 'int4', isNullable: false, columnDefault: null, isPrimaryKey: false, characterMaxLength: null, numericPrecision: 32 },
      ],
      primaryKeys: ['id'],
      foreignKeys: [
        { constraintName: 'fk_user', columnName: 'user_id', referencedTable: 'users', referencedColumn: 'id' },
      ],
      indexes: [],
    },
  ],
  timestamp: new Date().toISOString(),
};

const schemaNoFks: SchemaOverview = {
  tables: [
    {
      name: 'logs',
      schema: 'public',
      rowCount: 10,
      columns: [
        { name: 'id', dataType: 'integer', udtName: 'int4', isNullable: false, columnDefault: null, isPrimaryKey: true, characterMaxLength: null, numericPrecision: 32 },
      ],
      primaryKeys: ['id'],
      foreignKeys: [],
      indexes: [],
    },
  ],
  timestamp: new Date().toISOString(),
};

describe('RelationshipGraph', () => {
  it('should render the graph when FK relationships exist', () => {
    render(<RelationshipGraph schema={schemaWithFks} onSelectTable={vi.fn()} />);
    expect(screen.getByText('Relationships (1 connections)')).toBeInTheDocument();
  });

  it('should show table nodes in the SVG', () => {
    render(<RelationshipGraph schema={schemaWithFks} onSelectTable={vi.fn()} />);
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('posts')).toBeInTheDocument();
  });

  it('should not render when there are no FK relationships', () => {
    const { container } = render(
      <RelationshipGraph schema={schemaNoFks} onSelectTable={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('should collapse and expand', async () => {
    const user = userEvent.setup();
    render(<RelationshipGraph schema={schemaWithFks} onSelectTable={vi.fn()} />);

    // Should be visible initially
    expect(screen.getByText('users')).toBeInTheDocument();

    // Collapse
    await user.click(screen.getByText(/Hide/));
    expect(screen.getByText(/Show/)).toBeInTheDocument();

    // Expand
    await user.click(screen.getByText(/Show/));
    expect(screen.getByText('users')).toBeInTheDocument();
  });

  it('should call onSelectTable when a node is clicked', async () => {
    const user = userEvent.setup();
    const onSelectTable = vi.fn();
    render(<RelationshipGraph schema={schemaWithFks} onSelectTable={onSelectTable} />);

    await user.click(screen.getByText('users'));
    expect(onSelectTable).toHaveBeenCalledWith('users');
  });
});
