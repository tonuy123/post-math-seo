import { forwardRef } from 'react';

export const Input = forwardRef(function Input({ className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={[
        'w-full px-3 py-2 rounded border border-wp-gray-dark bg-white text-sm',
        'focus:outline-none focus:border-wp-blue focus:ring-2 focus:ring-wp-blue/20',
        'disabled:bg-wp-gray disabled:text-ink-muted',
        className,
      ].join(' ')}
      {...rest}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className = '', rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={[
        'w-full px-3 py-2 rounded border border-wp-gray-dark bg-white text-sm resize-y',
        'focus:outline-none focus:border-wp-blue focus:ring-2 focus:ring-wp-blue/20',
        className,
      ].join(' ')}
      {...rest}
    />
  );
});

export const Select = forwardRef(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select
      ref={ref}
      className={[
        'px-3 py-2 rounded border border-wp-gray-dark bg-white text-sm cursor-pointer min-w-[140px]',
        'focus:outline-none focus:border-wp-blue focus:ring-2 focus:ring-wp-blue/20',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Label({ children, htmlFor, className = '' }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium text-ink-secondary ${className}`}
    >
      {children}
    </label>
  );
}