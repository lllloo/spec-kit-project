import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../../src/components/forms/LoginForm';
import { renderWithProviders } from '../test-utils';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginForm', () => {
  it('renders 429 lockout message', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie')) return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(JSON.stringify({ message: '太多嘗試' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'brute@example.com');
    await user.type(screen.getByLabelText('密碼'), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: '登入' }));

    await waitFor(() => {
      expect(screen.getByText(/登入嘗試過於頻繁/)).toBeInTheDocument();
    });
  });

  it('sends remember=true when checkbox is checked', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie')) return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(JSON.stringify({ message: '登入成功', member: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'r@example.com');
    await user.type(screen.getByLabelText('密碼'), 'Strong1pass');
    await user.click(screen.getByLabelText(/記住我/));
    await user.click(screen.getByRole('button', { name: '登入' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"remember":true'),
        }),
      );
    });
  });
});
