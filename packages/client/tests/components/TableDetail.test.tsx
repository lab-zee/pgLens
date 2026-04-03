import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableDetail } from '@/components/TableDetail';
import type { TableInfo } from '@/types/schema';

const mockTable: TableInfo = {
  name: 'users',
  schema: 'public',
  rowCount: 100,
  columns: [
    { name: 'id', dataType: 'integer', udtName: 'int4', isNullable: false, columnDefault: "nextval('users_id_seq')", isPrimaryKey: true, characterMaxLength: null, numericPrecision: 32 },
    { name: 'email', dataType: 'varchar', udtName: 'varchar', isNullable: false, columnDefault: null, isPrimaryKey: false, characterMaxLength: 255, numericPrecision: null },
  ],
  primaryKeys: ['id'],
  foreignKeys: [
    { constraintName: 'fk_org', columnName: 'org_id', referencedTable: 'organizations', referencedColumn: 'id' },
  ],
  indexes: [
    { name: 'users_pkey', isUnique: true, columns: ['id'] },
    { name: 'idx_email', isUnique: true, columns: ['email'] },
  ],
};

describe('TableDetail', () => {
  it('should render column information', () => {
    render(<TableDetail table={mockTable} />);
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
    expect(screen.getByText('int4')).toBeInTheDocument();
    expect(screen.getByText('varchar')).toBeInTheDocument();
  });

  it('should indicate primary key columns', () => {
    render(<TableDetail table={mockTable} />);
    expect(screen.getByText('PK')).toBeInTheDocument();
  });

  it('should render foreign keys section', () => {
    render(<TableDetail table={mockTable} />);
    expect(screen.getByText('Foreign Keys')).toBeInTheDocument();
    expect(screen.getByText('org_id')).toBeInTheDocument();
    expect(screen.getByText('organizations')).toBeInTheDocument();
  });

  it('should render indexes section', () => {
    render(<TableDetail table={mockTable} />);
    expect(screen.getByText('Indexes')).toBeInTheDocument();
    expect(screen.getByText('users_pkey')).toBeInTheDocument();
    expect(screen.getAllByText('UNIQUE')).toHaveLength(2);
  });

  it('should hide FK section when there are no foreign keys', () => {
    const noFkTable = { ...mockTable, foreignKeys: [] };
    render(<TableDetail table={noFkTable} />);
    expect(screen.queryByText('Foreign Keys')).not.toBeInTheDocument();
  });

  it('should hide indexes section when there are no indexes', () => {
    const noIdxTable = { ...mockTable, indexes: [] };
    render(<TableDetail table={noIdxTable} />);
    expect(screen.queryByText('Indexes')).not.toBeInTheDocument();
  });
});
