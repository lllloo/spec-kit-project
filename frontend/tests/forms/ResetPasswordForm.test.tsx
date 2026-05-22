import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordForm } from '../../src/components/forms/ResetPasswordForm';
import { renderWithProviders } from '../test-utils';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ResetPasswordForm', () => {
  it('submits token from prop together with new password', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie'))
        return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(JSON.stringify({ message: '已重設密碼' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ResetPasswordForm token={'a'.repeat(64)} onSuccess={onSuccess} />,
    );

    await user.type(screen.getByLabelText('新密碼'), 'BrandNew1pass');
    await user.click(screen.getByRole('button', { name: '重設密碼' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/auth/password/reset',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"token":"aaaaaa'),
        }),
      );
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('renders 410 expired-token error', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie'))
        return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(JSON.stringify({ message: '連結已失效或已被使用' }), {
          status: 410,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordForm token={'b'.repeat(64)} />);

    await user.type(screen.getByLabelText('新密碼'), 'BrandNew1pass');
    await user.click(screen.getByRole('button', { name: '重設密碼' }));

    await waitFor(() => {
      expect(screen.getByText(/連結已失效或已被使用/)).toBeInTheDocument();
    });
  });
});
