import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileForm } from '../../src/components/forms/ProfileForm';
import type { Member } from '../../src/lib/auth';
import { renderWithProviders } from '../test-utils';

const baseMember: Member = {
  uuid: 'u-1',
  email: 'pf@example.com',
  email_verified: true,
  email_verified_at: '2026-05-22T00:00:00Z',
  display_name: 'Old',
  avatar_url: null,
  contact_info: null,
  last_login_at: null,
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('ProfileForm', () => {
  it('disables submit when form is not dirty', () => {
    renderWithProviders(<ProfileForm member={baseMember} />);
    expect(screen.getByRole('button', { name: '儲存變更' })).toBeDisabled();
  });

  it('enables submit after editing display_name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm member={baseMember} />);

    await user.clear(screen.getByLabelText('顯示名稱'));
    await user.type(screen.getByLabelText('顯示名稱'), 'New');

    expect(screen.getByRole('button', { name: '儲存變更' })).toBeEnabled();
  });

  it('renders server 422 errors on the matching field', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie')) return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(
          JSON.stringify({
            message: '驗證失敗',
            errors: { display_name: ['顯示名稱不可超過 64 字元'] },
          }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm member={baseMember} />);

    await user.clear(screen.getByLabelText('顯示名稱'));
    await user.type(screen.getByLabelText('顯示名稱'), 'x');
    await user.click(screen.getByRole('button', { name: '儲存變更' }));

    await waitFor(() => {
      expect(screen.getByText('顯示名稱不可超過 64 字元')).toBeInTheDocument();
    });
  });
});
