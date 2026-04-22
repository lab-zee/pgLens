import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableCard } from '@/components/TableCard';
import type { TableInfo } from '@/types/schema';

const mockTable: TableInfo = {
  name: 'users',
  schema: 'public',
  rowCount: 1234,
  columns: [
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
      name: 'email',
      dataType: 'varchar',
      udtName: 'varchar',
      isNullable: false,
      columnDefault: null,
      isPrimaryKey: false,
      characterMaxLength: 255,
      numericPrecision: null,
    },
    {
      name: 'name',
      dataType: 'varchar',
      udtName: 'varchar',
      isNullable: true,
      columnDefault: null,
      isPrimaryKey: false,
      characterMaxLength: 255,
      numericPrecision: null,
    },
  ],
  primaryKeys: ['id'],
  foreignKeys: [
    {
      constraintName: 'fk_org',
      columnName: 'org_id',
      referencedTable: 'orgs',
      referencedColumn: 'id',
    },
  ],
  indexes: [{ name: 'users_pkey', isUnique: true, columns: ['id'] }],
};

describe('TableCard', () => {
  it('should render the table name and row count', () => {
    render(<TableCard table={mockTable} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('1,234 rows')).toBeInTheDocument();
  });

  it('should show column names', () => {
    render(<TableCard table={mockTable} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  it('should show column count and FK count', () => {
    render(<TableCard table={mockTable} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('3 columns')).toBeInTheDocument();
    expect(screen.getByText('1 FK')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TableCard table={mockTable} isSelected={false} onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should show +N more when there are more than 6 columns', () => {
    const manyColumns = Array.from({ length: 8 }, (_, i) => ({
      name: `col_${i}`,
      dataType: 'text',
      udtName: 'text',
      isNullable: true,
      columnDefault: null,
      isPrimaryKey: false,
      characterMaxLength: null,
      numericPrecision: null,
    }));
    const bigTable = { ...mockTable, columns: manyColumns };
    render(<TableCard table={bigTable} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});
