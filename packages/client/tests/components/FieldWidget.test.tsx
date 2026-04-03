import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldWidget } from '@/components/FieldWidget';
import type { ColumnInfo } from '@/types/schema';

function col(overrides: Partial<ColumnInfo> = {}): ColumnInfo {
  return {
    name: 'test_col',
    dataType: 'text',
    udtName: 'text',
    isNullable: true,
    columnDefault: null,
    isPrimaryKey: false,
    characterMaxLength: null,
    numericPrecision: null,
    ...overrides,
  };
}

describe('FieldWidget', () => {
  it('should render NULL badge for null values', () => {
    render(<FieldWidget value={null} column={col()} />);
    expect(screen.getByText('NULL')).toBeInTheDocument();
  });

  it('should render boolean as toggle-style display', () => {
    const { container } = render(
      <FieldWidget value={true} column={col({ udtName: 'bool' })} />,
    );
    expect(screen.getByText('Yes')).toBeInTheDocument();
    // Should have the green toggle
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument();
  });

  it('should render false boolean correctly', () => {
    const { container } = render(
      <FieldWidget value={false} column={col({ udtName: 'bool' })} />,
    );
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(container.querySelector('.bg-gray-300')).toBeInTheDocument();
  });

  it('should render JSON as collapsible preview', () => {
    const jsonData = { name: 'test', nested: { a: 1 } };
    render(<FieldWidget value={jsonData} column={col({ udtName: 'jsonb' })} />);
    // Should show either expand button or the formatted JSON
    expect(screen.getByText(/expand|test/)).toBeInTheDocument();
  });

  it('should expand and collapse JSON', async () => {
    const user = userEvent.setup();
    const longJson = { a: 1, b: 2, c: 3, d: 4, long_key: 'this is a long value for testing' };
    render(<FieldWidget value={longJson} column={col({ udtName: 'jsonb' })} />);

    const expandBtn = screen.getByText('expand');
    await user.click(expandBtn);
    expect(screen.getByText('collapse')).toBeInTheDocument();

    await user.click(screen.getByText('collapse'));
    expect(screen.getByText('expand')).toBeInTheDocument();
  });

  it('should render timestamp with relative time', () => {
    const recent = new Date(Date.now() - 3600_000).toISOString(); // 1 hour ago
    render(<FieldWidget value={recent} column={col({ udtName: 'timestamptz' })} />);
    expect(screen.getByText('1h ago')).toBeInTheDocument();
  });

  it('should render date in readable format', () => {
    render(<FieldWidget value="2026-01-15" column={col({ udtName: 'date' })} />);
    expect(screen.getByText(/Jan/)).toBeInTheDocument();
  });

  it('should render UUID with full value and copy action', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    render(<FieldWidget value={uuid} column={col({ udtName: 'uuid' })} />);
    expect(screen.getByText(uuid)).toBeInTheDocument();
    expect(screen.getByText('copy')).toBeInTheDocument();
  });

  it('should render integers as formatted numbers', () => {
    render(<FieldWidget value={1234567} column={col({ udtName: 'int4' })} />);
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('should render money as currency', () => {
    render(<FieldWidget value={42.5} column={col({ udtName: 'money' })} />);
    expect(screen.getByText('$42.50')).toBeInTheDocument();
  });

  it('should render arrays as tag list', () => {
    render(<FieldWidget value={['a', 'b', 'c']} column={col({ udtName: '_text' })} />);
    expect(screen.getByText('"a"')).toBeInTheDocument();
    expect(screen.getByText('"b"')).toBeInTheDocument();
    expect(screen.getByText('"c"')).toBeInTheDocument();
  });

  it('should render empty arrays as "empty array"', () => {
    render(<FieldWidget value={[]} column={col({ udtName: '_text' })} />);
    expect(screen.getByText('empty array')).toBeInTheDocument();
  });

  it('should render email columns as mailto links', () => {
    render(
      <FieldWidget value="test@example.com" column={col({ name: 'email' })} />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'mailto:test@example.com');
  });

  it('should detect email by value pattern', () => {
    render(<FieldWidget value="user@domain.com" column={col({ name: 'contact' })} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'mailto:user@domain.com');
  });

  it('should render URL columns as clickable links', () => {
    render(
      <FieldWidget value="https://example.com" column={col({ name: 'website_url' })} />,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should render hex colors with a swatch', () => {
    const { container } = render(
      <FieldWidget value="#ff5733" column={col()} />,
    );
    const swatch = container.querySelector('[style*="background-color"]');
    expect(swatch).toBeInTheDocument();
    expect(screen.getByText('#ff5733')).toBeInTheDocument();
  });

  it('should render long text as expandable', async () => {
    const user = userEvent.setup();
    const longText = 'x'.repeat(150);
    render(<FieldWidget value={longText} column={col()} />);
    expect(screen.getByText(/show all/)).toBeInTheDocument();

    await user.click(screen.getByText(/show all/));
    expect(screen.getByText('show less')).toBeInTheDocument();
  });

  it('should render short text as plain text', () => {
    render(<FieldWidget value="hello world" column={col()} />);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });
});
