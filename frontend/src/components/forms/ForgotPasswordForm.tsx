import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '../../lib/api';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../../lib/schemas';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';

type Props = {
  onSuccess?: () => void;
};

export function ForgotPasswordForm({ onSuccess }: Props) {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'success' | 'error'>('success');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      api<{ message: string }>('POST', '/api/v1/auth/password/forgot', input),
    onSuccess: ({ message }) => {
      setTone('success');
      setServerMessage(message);
      onSuccess?.();
    },
    onError: (err) => {
      setTone('error');
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setServerMessage('請求過於頻繁，請稍後再試');
        } else {
          setServerMessage(err.body.message ?? '寄送失敗');
        }
      } else {
        setServerMessage('寄送失敗，請稍後再試');
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
      {serverMessage && <Alert tone={tone}>{serverMessage}</Alert>}

      <FormField label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          invalid={!!errors.email}
          {...register('email')}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting || mutation.isPending} className="w-full">
        {isSubmitting || mutation.isPending ? '寄送中…' : '寄出重設連結'}
      </Button>
    </form>
  );
}
