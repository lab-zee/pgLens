import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '@/components/SearchBar';
import type { ColumnInfo } from '@/types/schema';

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
];

describe('SearchBar', () => {
  it('should render search input and column selector', () => {
    render(<SearchBar columns={columns} onSearch={vi.fn()} />);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Search column')).toBeInTheDocument();
  });

  it('should show all columns in the dropdown plus "All columns"', () => {
    render(<SearchBar columns={columns} onSearch={vi.fn()} />);
    expect(screen.getByText('All columns')).toBeInTheDocument();
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  it('should call onSearch after typing (debounced)', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<SearchBar columns={columns} onSearch={onSearch} debounceMs={50} />);
    await user.type(screen.getByLabelText('Search'), 'alice');

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('alice', undefined);
    });
  });

  it('should pass searchColumn when a column is selected', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    render(<SearchBar columns={columns} onSearch={onSearch} debounceMs={50} />);

    await user.selectOptions(screen.getByLabelText('Search column'), 'email');
    await user.type(screen.getByLabelText('Search'), 'test');

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test', 'email');
    });
  });

  it('should show clear button when there is text', async () => {
    const user = userEvent.setup();
    render(<SearchBar columns={columns} onSearch={vi.fn()} debounceMs={0} />);

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Search'), 'hello');
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('should clear search when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar columns={columns} onSearch={onSearch} debounceMs={50} />);

    await user.type(screen.getByLabelText('Search'), 'test');
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test', undefined);
    });

    await user.click(screen.getByLabelText('Clear search'));
    // After clear, the input is empty and the column selector is reset
    await waitFor(() => {
      // The last call should have empty search (either via direct dispatch or debounced effect)
      const lastCall = onSearch.mock.calls[onSearch.mock.calls.length - 1];
      expect(lastCall[0]).toBe('');
    });
  });
});
