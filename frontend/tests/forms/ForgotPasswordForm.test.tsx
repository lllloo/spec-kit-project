import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordForm } from '../../src/components/forms/ForgotPasswordForm';
import { renderWithProviders } from '../test-utils';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ForgotPasswordForm', () => {
  it('shows success message regardless of email existence (FR-009)', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie'))
        return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(
          JSON.stringify({ message: '若該帳號存在，已寄出密碼重設信' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText('Email'), 'ghost@example.com');
    await user.click(screen.getByRole('button', { name: '寄出重設連結' }));

    await waitFor(() => {
      expect(screen.getByText(/若該帳號存在/)).toBeInTheDocument();
    });
  });

  it('shows 429 throttle message', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie'))
        return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(JSON.stringify({ message: '太多嘗試' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText('Email'), 'rate@example.com');
    await user.click(screen.getByRole('button', { name: '寄出重設連結' }));

    await waitFor(() => {
      expect(screen.getByText(/請求過於頻繁/)).toBeInTheDocument();
    });
  });
});
