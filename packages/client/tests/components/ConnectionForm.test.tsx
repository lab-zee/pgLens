import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionForm } from '@/components/ConnectionForm';
import { saveConnection } from '@/lib/saved-connections';

describe('ConnectionForm', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render the landing page with branding and feature cards', () => {
    render(<ConnectionForm onConnect={vi.fn()} isConnecting={false} error={null} />);
    expect(screen.getByText('pgLens')).toBeInTheDocument();
    expect(screen.getByText('See your data clearly.')).toBeInTheDocument();
    expect(screen.getByLabelText('Connection String')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
    // Feature cards
    expect(screen.getByText('Schema Discovery')).toBeInTheDocument();
    expect(screen.getByText('Smart UI')).toBeInTheDocument();
    expect(screen.getByText('Relationship Map')).toBeInTheDocument();
    expect(screen.getByText('Search & Browse')).toBeInTheDocument();
    // Privacy footer
    expect(screen.getByText(/never persisted server-side/)).toBeInTheDocument();
    expect(screen.getByText('MIT License')).toBeInTheDocument();
  });

  it('should call onConnect with the connection string on submit', async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();
    render(<ConnectionForm onConnect={onConnect} isConnecting={false} error={null} />);

    const input = screen.getByLabelText('Connection String');
    await user.type(input, 'postgresql://user:pass@localhost/db');
    await user.click(screen.getByRole('button', { name: 'Connect' }));

    expect(onConnect).toHaveBeenCalledWith('postgresql://user:pass@localhost/db');
  });

  it('should disable the button when input is empty', () => {
    render(<ConnectionForm onConnect={vi.fn()} isConnecting={false} error={null} />);
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
  });

  it('should disable the form while connecting', () => {
    render(<ConnectionForm onConnect={vi.fn()} isConnecting={true} error={null} />);
    expect(screen.getByLabelText('Connection String')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Connecting...' })).toBeDisabled();
  });

  it('should display an error message', () => {
    render(
      <ConnectionForm onConnect={vi.fn()} isConnecting={false} error="Connection refused" />,
    );
    expect(screen.getByText('Connection refused')).toBeInTheDocument();
  });

  it('should not submit if only whitespace is entered', async () => {
    const user = userEvent.setup();
    const onConnect = vi.fn();
    render(<ConnectionForm onConnect={onConnect} isConnecting={false} error={null} />);

    const input = screen.getByLabelText('Connection String');
    await user.type(input, '   ');
    await user.click(screen.getByRole('button', { name: 'Connect' }));

    expect(onConnect).not.toHaveBeenCalled();
  });

  describe('saved connections', () => {
    it('should not show recent connections section when none are saved', () => {
      render(<ConnectionForm onConnect={vi.fn()} isConnecting={false} error={null} />);
      expect(screen.queryByText('Recent connections')).not.toBeInTheDocument();
    });

    it('should show saved connections with masked passwords', () => {
      saveConnection('postgresql://user:secretpass@myhost:5432/mydb');
      render(<ConnectionForm onConnect={vi.fn()} isConnecting={false} error={null} />);

      expect(screen.getByText('Recent connections')).toBeInTheDocument();
      expect(screen.getByText('mydb @ myhost:5432')).toBeInTheDocument();
      // Password should be masked
      expect(screen.getByText(/user:\*\*\*\*@myhost/)).toBeInTheDocument();
      // Full password should NOT appear
      expect(screen.queryByText(/secretpass/)).not.toBeInTheDocument();
    });

    it('should connect directly when clicking a saved connection', async () => {
      const user = userEvent.setup();
      const onConnect = vi.fn();
      saveConnection('postgresql://user:pass@host/testdb');

      render(<ConnectionForm onConnect={onConnect} isConnecting={false} error={null} />);
      await user.click(screen.getByText('testdb @ host'));

      expect(onConnect).toHaveBeenCalledWith('postgresql://user:pass@host/testdb');
    });

    it('should populate input when clicking Edit', async () => {
      const user = userEvent.setup();
      saveConnection('postgresql://user:pass@host/testdb');

      render(<ConnectionForm onConnect={vi.fn()} isConnecting={false} error={null} />);
      await user.click(screen.getByText('Edit'));

      expect(screen.getByLabelText('Connection String')).toHaveValue(
        'postgresql://user:pass@host/testdb',
      );
    });

    it('should remove a saved connection when clicking Remove', async () => {
      const user = userEvent.setup();
      saveConnection('postgresql://user:pass@host/testdb');

      render(<ConnectionForm onConnect={vi.fn()} isConnecting={false} error={null} />);
      await user.click(screen.getByLabelText('Remove testdb @ host'));

      expect(screen.queryByText('testdb @ host')).not.toBeInTheDocument();
      expect(screen.queryByText('Recent connections')).not.toBeInTheDocument();
    });
  });
});
