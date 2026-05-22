import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyEmailPage } from '../../src/routes/auth/VerifyEmailPage';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderAt(url: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return render(<VerifyEmailPage />, { wrapper: Wrapper });
}

describe('VerifyEmailPage', () => {
  it('auto-fires verify on mount and shows success', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie')) return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(JSON.stringify({ message: 'Email 已驗證完成，可以登入了' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    renderAt('/verify-email?token=' + 'a'.repeat(64));

    await waitFor(() => {
      expect(screen.getByText(/Email 已驗證完成/)).toBeInTheDocument();
    });
    const verifyCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/v1/auth/email/verify'));
    expect(verifyCalls).toHaveLength(1);
  });

  it('shows error alert on 410', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie')) return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(JSON.stringify({ message: '連結已失效或已被使用' }), {
          status: 410,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    renderAt('/verify-email?token=' + 'b'.repeat(64));

    await waitFor(() => {
      expect(screen.getByText(/連結已失效或已被使用/)).toBeInTheDocument();
    });
  });

  it('shows missing-token error when no token in URL', () => {
    renderAt('/verify-email');
    expect(screen.getByText(/驗證連結缺少 token 參數/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
