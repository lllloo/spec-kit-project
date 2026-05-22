import { forwardRef, type InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { invalid, className = '', ...props },
  ref,
) {
  const base =
    'block w-full rounded-md border-0 px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:bg-gray-100 disabled:text-gray-500';
  const tone = invalid
    ? 'ring-red-400 focus:ring-red-500'
    : 'ring-gray-300 focus:ring-indigo-600';
  return <input ref={ref} className={`${base} ${tone} ${className}`} {...props} />;
});
