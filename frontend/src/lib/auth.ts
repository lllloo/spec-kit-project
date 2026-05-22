import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';

export type Member = {
  uuid: string;
  email: string;
  email_verified_at: string | null;
  display_name: string | null;
  avatar_path: string | null;
  contact_info: string | null;
};

export const sessionQueryKey = ['auth', 'me'] as const;

async function fetchMe(): Promise<Member | null> {
  try {
    return await api<Member>('GET', '/api/v1/auth/me');
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchMe,
    staleTime: 60_000,
  });
}

export function useAuthInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: sessionQueryKey });
}
