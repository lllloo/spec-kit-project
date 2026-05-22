import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '../../lib/api';
import { resetPasswordSchema, type ResetPasswordInput } from '../../lib/schemas';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';

type Props = {
  token: string;
  onSuccess?: () => void;
};

export function ResetPasswordForm({ token, onSuccess }: Props) {
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  const mutation = useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      api<{ message: string }>('POST', '/api/v1/auth/password/reset', {
        token,
        password: input.password,
      }),
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 410) {
          setServerMessage(err.body.message ?? '連結已失效或已被使用');
        } else if (err.status === 422 && err.body.errors) {
          if (err.body.errors.password) {
            setError('password', { message: err.body.errors.password[0] });
          }
          if (err.body.errors.token) {
            setServerMessage(err.body.errors.token[0]);
          }
        } else {
          setServerMessage(err.body.message ?? '重設失敗');
        }
      } else {
        setServerMessage('重設失敗，請稍後再試');
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

      <FormField
        label="新密碼"
        htmlFor="password"
        hint="至少 8 字元，含字母與數字"
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          invalid={!!errors.password}
          {...register('password')}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting || mutation.isPending} className="w-full">
        {isSubmitting || mutation.isPending ? '送出中…' : '重設密碼'}
      </Button>
    </form>
  );
}
