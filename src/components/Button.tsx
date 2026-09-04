import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline' | 'light';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-primary-700 text-white hover:bg-primary-800 active:bg-primary-900 shadow-sm',
  secondary: 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 dark:bg-primary-900/50 dark:text-primary-300 dark:hover:bg-primary-900/70 dark:border-primary-800',
  ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
  danger: 'bg-danger text-white hover:bg-red-700 shadow-sm',
  success: 'bg-success text-white hover:bg-green-700 shadow-sm',
  outline: 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-600 dark:hover:bg-neutral-700',
  light: 'bg-white text-primary-800 hover:bg-primary-50 active:bg-primary-100 shadow-sm',
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-5 py-3.5',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  as?: 'button' | 'a';
  children: ReactNode;
  className?: string;
  href?: string;
};

export function Button(props: CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' | undefined; href?: never }): ReactNode;
export function Button(props: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a'; href: string }): ReactNode;
export function Button({
  variant = 'primary',
  size = 'md',
  full,
  as = 'button',
  children,
  className = '',
  href,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement> | CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`;
  if (as === 'a') {
    return (
      <a className={classes} href={href} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} className={classes}>
      {children}
    </button>
  );
}