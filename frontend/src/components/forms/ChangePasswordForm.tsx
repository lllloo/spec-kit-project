import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '../../lib/api';
import { changePasswordSchema, type ChangePasswordInput } from '../../lib/schemas';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';

type Props = {
  onSuccess?: () => void;
};

export function ChangePasswordForm({ onSuccess }: Props) {
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: '', new_password: '' },
  });

  const mutation = useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      api<{ message: string }>('PATCH', '/api/v1/profile/password', input),
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.body.errors) {
          for (const [field, msg] of Object.entries(err.fieldErrors())) {
            setError(field as keyof ChangePasswordInput, { message: msg });
          }
          if (!err.body.errors.current_password && !err.body.errors.new_password) {
            setServerMessage(err.body.message ?? '驗證失敗');
          }
        } else {
          setServerMessage(err.body.message ?? '變更密碼失敗');
        }
      } else {
        setServerMessage('變更密碼失敗，請稍後再試');
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

      <FormField label="目前密碼" htmlFor="current_password" error={errors.current_password?.message}>
        <Input
          id="current_password"
          type="password"
          autoComplete="current-password"
          invalid={!!errors.current_password}
          {...register('current_password')}
        />
      </FormField>

      <FormField
        label="新密碼"
        htmlFor="new_password"
        hint="至少 8 字元，含字母與數字"
        error={errors.new_password?.message}
      >
        <Input
          id="new_password"
          type="password"
          autoComplete="new-password"
          invalid={!!errors.new_password}
          {...register('new_password')}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting || mutation.isPending} className="w-full">
        {isSubmitting || mutation.isPending ? '送出中…' : '變更密碼'}
      </Button>
    </form>
  );
}
