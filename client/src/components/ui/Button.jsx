/**
 * Component nút nhỏ với các biến thể (primary/secondary/danger/ghost) và kích thước.
 */
import { forwardRef } from 'react';

const VARIANTS = {
  primary:   'bg-wp-blue text-white border-wp-blue hover:bg-wp-blue-hover hover:border-wp-blue-hover',
  secondary: 'bg-white text-ink-primary border-wp-gray-dark hover:bg-wp-gray',
  danger:    'bg-wp-red text-white border-wp-red hover:bg-red-700',
  ghost:     'bg-transparent text-ink-primary border-transparent hover:bg-wp-gray',
};

const SIZES = {
  sm:   'px-2.5 py-1 text-xs',
  md:   'px-4 py-2 text-sm',
  lg:   'px-5 py-3 text-base',
};

export const Button = forwardRef(function Button(
  { children, variant = 'primary', size = 'md', className = '', leftIcon, rightIcon, loading, disabled, ...rest },
  ref
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded border font-medium transition',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});