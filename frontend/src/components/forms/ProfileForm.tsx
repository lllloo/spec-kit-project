import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { api, ApiError } from '../../lib/api';
import { sessionQueryKey, type Member } from '../../lib/auth';
import { profileSchema, type ProfileInput } from '../../lib/schemas';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Input } from '../ui/Input';

type Props = {
  member: Member;
};

export function ProfileForm({ member }: Props) {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: member.display_name ?? '',
      contact_info: member.contact_info ?? '',
    },
  });

  useEffect(() => {
    reset({
      display_name: member.display_name ?? '',
      contact_info: member.contact_info ?? '',
    });
  }, [member, reset]);

  const mutation = useMutation({
    mutationFn: (input: ProfileInput) =>
      api<Member>('PATCH', '/api/v1/profile', {
        display_name: input.display_name || null,
        contact_info: input.contact_info || null,
      }),
    onSuccess: (updated) => {
      setServerMessage('已儲存');
      qc.setQueryData(sessionQueryKey, updated);
      reset({
        display_name: updated.display_name ?? '',
        contact_info: updated.contact_info ?? '',
      });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 422) {
        for (const [field, msg] of Object.entries(err.fieldErrors())) {
          setError(field as keyof ProfileInput, { message: msg });
        }
      } else {
        setServerMessage('儲存失敗，請稍後再試');
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
      {serverMessage && (
        <Alert tone={mutation.isError ? 'error' : 'success'}>{serverMessage}</Alert>
      )}

      <FormField label="Email" htmlFor="email">
        <Input id="email" type="email" value={member.email} disabled />
      </FormField>

      <FormField label="顯示名稱" htmlFor="display_name" error={errors.display_name?.message}>
        <Input
          id="display_name"
          type="text"
          invalid={!!errors.display_name}
          {...register('display_name')}
        />
      </FormField>

      <FormField
        label="聯絡資訊"
        htmlFor="contact_info"
        hint="例如 Discord / LINE ID"
        error={errors.contact_info?.message}
      >
        <Input
          id="contact_info"
          type="text"
          invalid={!!errors.contact_info}
          {...register('contact_info')}
        />
      </FormField>

      <Button type="submit" disabled={!isDirty || isSubmitting || mutation.isPending}>
        {mutation.isPending ? '儲存中…' : '儲存變更'}
      </Button>
    </form>
  );
}
