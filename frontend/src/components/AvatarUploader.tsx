import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { sessionQueryKey } from '../lib/auth';
import { AVATAR_ACCEPT, AVATAR_MAX_BYTES } from '../lib/schemas';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';

type Props = {
  currentUrl: string | null;
  /** 上傳成功後可選擇傳新 URL 給外層；同時也會 invalidate sessionQueryKey */
  onUploaded?: (url: string) => void;
};

export function AvatarUploader({ currentUrl, onUploaded }: Props) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('avatar', file);
      return api<{ avatar_url: string }>('POST', '/api/v1/profile/avatar', form);
    },
    onSuccess: ({ avatar_url }) => {
      setPreview(avatar_url);
      qc.invalidateQueries({ queryKey: sessionQueryKey });
      onUploaded?.(avatar_url);
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? (err.body.errors?.avatar?.[0] ?? err.body.message)
          : '上傳失敗',
      );
    },
  });

  function pickFile(file: File): void {
    setError(null);

    if (!AVATAR_ACCEPT.includes(file.type as (typeof AVATAR_ACCEPT)[number])) {
      setError('檔案格式必須是 jpg / png / webp');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError('檔案不可超過 2 MB');
      return;
    }

    setPreview(URL.createObjectURL(file));
    mutation.mutate(file);
  }

  return (
    <div className="space-y-3">
      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-200">
          {preview ? (
            <img src={preview} alt="頭像預覽" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
              無頭像
            </div>
          )}
        </div>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT.join(',')}
            className="hidden"
            data-testid="avatar-input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickFile(file);
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? '上傳中…' : '選擇圖片'}
          </Button>
          <p className="mt-1 text-xs text-gray-500">jpg / png / webp，≤ 2 MB</p>
        </div>
      </div>
    </div>
  );
}
