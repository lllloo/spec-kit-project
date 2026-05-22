import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '../../src/components/forms/RegisterForm';
import { renderWithProviders } from '../test-utils';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  // 給 CSRF endpoint 一個空 204 fallback
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/sanctum/csrf-cookie')) {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(
      new Response(JSON.stringify({ message: '註冊成功' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RegisterForm', () => {
  it('shows client-side validation error when password too short', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('密碼'), 'Aa1');
    await user.click(screen.getByRole('button', { name: '註冊' }));

    expect(await screen.findByText('密碼長度至少 8 字元')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows client-side validation when password lacks digit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('密碼'), 'onlyletters');
    await user.click(screen.getByRole('button', { name: '註冊' }));

    expect(await screen.findByText('密碼必須包含至少一個數字')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits and shows success message', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('密碼'), 'Strong1pass');
    await user.click(screen.getByRole('button', { name: '註冊' }));

    await waitFor(() => {
      expect(screen.getByText(/註冊成功/)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/register',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('renders server validation errors on 422', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie')) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            message: '驗證失敗',
            errors: { email: ['此 Email 已被使用'] },
          }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    const user = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await user.type(screen.getByLabelText('Email'), 'dup@example.com');
    await user.type(screen.getByLabelText('密碼'), 'Strong1pass');
    await user.click(screen.getByRole('button', { name: '註冊' }));

    expect(await screen.findByText('此 Email 已被使用')).toBeInTheDocument();
  });
});
