import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '../../lib/api';
import { sessionQueryKey, type Member } from '../../lib/auth';
import { loginSchema, type LoginInput } from '../../lib/schemas';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';

type Props = {
  onSuccess?: () => void;
};

export function LoginForm({ onSuccess }: Props) {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const mutation = useMutation({
    mutationFn: (input: LoginInput) =>
      api<{ message: string; member: Member }>('POST', '/api/v1/auth/login', input),
    onSuccess: (data) => {
      // 用登入回應直接 seed session cache，避免導向受保護頁時 ProtectedRoute
      // 讀到舊的未登入 session（invalidate 為異步 refetch）而誤踢回 /login。
      qc.setQueryData(sessionQueryKey, data.member);
      qc.invalidateQueries({ queryKey: sessionQueryKey });
      onSuccess?.();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setServerMessage('登入嘗試過於頻繁，請稍後再試');
        } else if (err.status === 422 && err.body.errors) {
          for (const [field, msg] of Object.entries(err.fieldErrors())) {
            setError(field as keyof LoginInput, { message: msg });
          }
          if (!err.body.errors.email && !err.body.errors.password) {
            setServerMessage(err.body.message ?? '認證失敗');
          }
        } else {
          setServerMessage(err.body.message ?? '認證失敗');
        }
      }
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => {
        setServerMessage(null);
        mutation.mutate(data);
      })}
      className="space-y-4"
      noValidate
    >
      {serverMessage && <Alert tone="error">{serverMessage}</Alert>}

      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
      </FormField>

      <FormField label="密碼" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          invalid={!!errors.password}
          {...register('password')}
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" className="h-4 w-4 rounded border-gray-300" {...register('remember')} />
        記住我（14 天內保持登入）
      </label>

      <Button type="submit" disabled={isSubmitting || mutation.isPending} className="w-full">
        {isSubmitting || mutation.isPending ? '登入中…' : '登入'}
      </Button>
    </form>
  );
}
