import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '../../lib/api';
import { registerSchema, type RegisterInput } from '../../lib/schemas';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';

type Props = {
  onSuccess?: () => void;
};

export function RegisterForm({ onSuccess }: Props) {
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', display_name: '' },
  });

  const mutation = useMutation({
    mutationFn: (input: RegisterInput) =>
      api<{ message: string }>('POST', '/api/v1/auth/register', input),
    onSuccess: ({ message }) => {
      setServerMessage(message);
      onSuccess?.();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.body.errors) {
          for (const [field, msg] of Object.entries(err.fieldErrors())) {
            setError(field as keyof RegisterInput, { message: msg });
          }
        } else {
          setServerMessage(err.body.message ?? '註冊失敗');
        }
      } else {
        setServerMessage('註冊失敗，請稍後再試');
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
      {serverMessage && <Alert tone={mutation.isSuccess ? 'success' : 'error'}>{serverMessage}</Alert>}

      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" invalid={!!errors.email} {...register('email')} />
      </FormField>

      <FormField
        label="密碼"
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

      <FormField label="顯示名稱（選填）" htmlFor="display_name" error={errors.display_name?.message}>
        <Input
          id="display_name"
          type="text"
          autoComplete="nickname"
          invalid={!!errors.display_name}
          {...register('display_name')}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting || mutation.isPending} className="w-full">
        {isSubmitting || mutation.isPending ? '送出中…' : '註冊'}
      </Button>
    </form>
  );
}
