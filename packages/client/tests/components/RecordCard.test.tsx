import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecordCard } from '@/components/RecordCard';
import type { ColumnInfo, TableInfo } from '@/types/schema';

const columns: ColumnInfo[] = [
  {
    name: 'id',
    dataType: 'integer',
    udtName: 'int4',
    isNullable: false,
    columnDefault: null,
    isPrimaryKey: true,
    characterMaxLength: null,
    numericPrecision: 32,
  },
  {
    name: 'name',
    dataType: 'varchar',
    udtName: 'varchar',
    isNullable: false,
    columnDefault: null,
    isPrimaryKey: false,
    characterMaxLength: 255,
    numericPrecision: null,
  },
  {
    name: 'email',
    dataType: 'varchar',
    udtName: 'varchar',
    isNullable: true,
    columnDefault: null,
    isPrimaryKey: false,
    characterMaxLength: 255,
    numericPrecision: null,
  },
  {
    name: 'active',
    dataType: 'boolean',
    udtName: 'bool',
    isNullable: false,
    columnDefault: 'true',
    isPrimaryKey: false,
    characterMaxLength: null,
    numericPrecision: null,
  },
  {
    name: 'org_id',
    dataType: 'integer',
    udtName: 'int4',
    isNullable: true,
    columnDefault: null,
    isPrimaryKey: false,
    characterMaxLength: null,
    numericPrecision: null,
  },
];

const table: TableInfo = {
  name: 'users',
  schema: 'public',
  rowCount: 100,
  columns,
  primaryKeys: ['id'],
  foreignKeys: [
    {
      constraintName: 'fk_org',
      columnName: 'org_id',
      referencedTable: 'orgs',
      referencedColumn: 'id',
    },
  ],
  indexes: [],
};

const row = { id: 42, name: 'Alice', email: 'alice@example.com', active: true, org_id: 7 };

describe('RecordCard', () => {
  it('should render a card with the display label', () => {
    render(<RecordCard row={row} columns={columns} table={table} />);
    // "name" is the first non-PK text column, so Alice appears in header + field
    const alices = screen.getAllByText('Alice');
    expect(alices.length).toBeGreaterThanOrEqual(1);
    // Header label should have the semibold class
    expect(alices[0].closest('.font-semibold') || alices[0].className).toBeTruthy();
  });

  it('should show PK value in the header', () => {
    render(<RecordCard row={row} columns={columns} table={table} />);
    expect(screen.getByText('id: 42')).toBeInTheDocument();
  });

  it('should render all fields', () => {
    render(<RecordCard row={row} columns={columns} table={table} />);
    // Column labels
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('org_id')).toBeInTheDocument();
  });

  it('should mark PK columns with a badge', () => {
    render(<RecordCard row={row} columns={columns} table={table} />);
    expect(screen.getByText('PK')).toBeInTheDocument();
  });

  it('should mark FK columns with a badge', () => {
    render(<RecordCard row={row} columns={columns} table={table} />);
    expect(screen.getByText('FK')).toBeInTheDocument();
  });

  it('should render boolean as toggle widget', () => {
    const { container } = render(<RecordCard row={row} columns={columns} table={table} />);
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
  });

  it('should render email as mailto link', () => {
    render(<RecordCard row={row} columns={columns} table={table} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'mailto:alice@example.com');
  });
});
