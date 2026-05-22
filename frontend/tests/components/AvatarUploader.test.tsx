import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarUploader } from '../../src/components/AvatarUploader';
import { renderWithProviders } from '../test-utils';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  // jsdom 沒有 createObjectURL，補 polyfill
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:mock'),
  });
});
afterEach(() => vi.unstubAllGlobals());

function makeFile(name: string, type: string, sizeKB: number): File {
  return new File([new Uint8Array(sizeKB * 1024)], name, { type });
}

describe('AvatarUploader', () => {
  it('rejects unsupported mime client-side without sending request', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AvatarUploader currentUrl={null} />);

    const input = screen.getByTestId('avatar-input') as HTMLInputElement;
    const evil = makeFile('virus.exe', 'application/x-msdownload', 10);

    await user.upload(input, evil);

    expect(screen.getByText(/jpg \/ png \/ webp/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects > 2MB file client-side', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AvatarUploader currentUrl={null} />);

    const big = makeFile('big.png', 'image/png', 2500);
    await user.upload(screen.getByTestId('avatar-input') as HTMLInputElement, big);

    expect(screen.getByText('檔案不可超過 2 MB')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uploads a valid png and shows preview', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/sanctum/csrf-cookie')) return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(
        new Response(JSON.stringify({ avatar_url: 'http://localhost:8000/storage/avatars/x.png' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    const user = userEvent.setup();
    renderWithProviders(<AvatarUploader currentUrl={null} />);

    const file = makeFile('me.png', 'image/png', 50);
    await user.upload(screen.getByTestId('avatar-input') as HTMLInputElement, file);

    await waitFor(() => {
      const img = screen.getByAltText('頭像預覽') as HTMLImageElement;
      expect(img).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/profile/avatar',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
