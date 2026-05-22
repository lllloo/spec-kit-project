import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordForm } from '../../src/components/forms/ChangePasswordForm';
import { renderWithProviders } from '../test-utils';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ChangePasswordForm', () => {
  it('shows client-side error when new password is weak', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    await user.type(screen.getByLabelText('目前密碼'), 'Old1pass!!');
    await user.type(screen.getByLabelText('新密碼'), 'weak');
    await user.click(screen.getByRole('button', { name: '變更密碼' }));

    await waitFor(() => {
      expect(screen.getByText(/密碼長度至少 8 字元/)).toBeInTheDocument();
    });
  });

  it('renders server 422 error on current_password', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie'))
        return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(
          JSON.stringify({
            message: '驗證失敗',
            errors: { current_password: ['目前密碼錯誤'] },
          }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm />);

    await user.type(screen.getByLabelText('目前密碼'), 'Wrong1pass');
    await user.type(screen.getByLabelText('新密碼'), 'New1pass!!');
    await user.click(screen.getByRole('button', { name: '變更密碼' }));

    await waitFor(() => {
      expect(screen.getByText('目前密碼錯誤')).toBeInTheDocument();
    });
  });

  it('calls onSuccess on 200', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie'))
        return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(JSON.stringify({ message: '已變更密碼' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('目前密碼'), 'Old1pass!!');
    await user.type(screen.getByLabelText('新密碼'), 'New1pass!!');
    await user.click(screen.getByRole('button', { name: '變更密碼' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
