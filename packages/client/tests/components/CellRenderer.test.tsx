import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CellRenderer } from '@/components/ColumnTypeRenderer';

describe('CellRenderer', () => {
  it('should render NULL for null values', () => {
    render(<CellRenderer value={null} udtName="text" />);
    expect(screen.getByText('NULL')).toBeInTheDocument();
  });

  it('should render NULL for undefined values', () => {
    render(<CellRenderer value={undefined} udtName="text" />);
    expect(screen.getByText('NULL')).toBeInTheDocument();
  });

  it('should render boolean true', () => {
    render(<CellRenderer value={true} udtName="bool" />);
    expect(screen.getByText('true')).toBeInTheDocument();
  });

  it('should render boolean false', () => {
    render(<CellRenderer value={false} udtName="bool" />);
    expect(screen.getByText('false')).toBeInTheDocument();
  });

  it('should render JSON as formatted pre block', () => {
    const jsonValue = { key: 'value' };
    render(<CellRenderer value={jsonValue} udtName="jsonb" />);
    expect(screen.getByText(/key/)).toBeInTheDocument();
  });

  it('should render UUID truncated with ellipsis', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    render(<CellRenderer value={uuid} udtName="uuid" />);
    expect(screen.getByText('550e8400...')).toBeInTheDocument();
  });

  it('should render numbers with tabular-nums class', () => {
    const { container } = render(<CellRenderer value={42} udtName="int4" />);
    expect(container.querySelector('.tabular-nums')).toBeInTheDocument();
  });

  it('should truncate long text with ellipsis', () => {
    const longText = 'a'.repeat(150);
    render(<CellRenderer value={longText} udtName="text" />);
    expect(screen.getByText(`${'a'.repeat(100)}...`)).toBeInTheDocument();
  });

  it('should render short text as-is', () => {
    render(<CellRenderer value="hello" udtName="text" />);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('should render arrays as bracket notation', () => {
    render(<CellRenderer value={[1, 2, 3]} udtName="_int4" />);
    expect(screen.getByText('[1, 2, 3]')).toBeInTheDocument();
  });
});
