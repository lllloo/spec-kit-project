import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'error';

type Props = {
  tone?: Tone;
  children: ReactNode;
};

const tones: Record<Tone, string> = {
  info: 'bg-blue-50 text-blue-800 ring-blue-200',
  success: 'bg-green-50 text-green-800 ring-green-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  error: 'bg-red-50 text-red-800 ring-red-200',
};

export function Alert({ tone = 'info', children }: Props) {
  return (
    <div
      role="alert"
      className={`rounded-md p-3 text-sm ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
