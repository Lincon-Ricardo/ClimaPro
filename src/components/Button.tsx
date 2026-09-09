import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline' | 'light';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'cp-btn-primary text-white font-bold tracking-tight',
  secondary: 'bg-primary-50 text-primary-800 hover:bg-primary-100 border border-primary-200 dark:bg-primary-950/60 dark:text-primary-100 dark:hover:bg-primary-900/60 dark:border-primary-700/60 shadow-sm',
  ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-white/10',
  danger: 'bg-gradient-to-br from-red-500 to-red-700 text-white hover:brightness-110 shadow-[0_12px_28px_-12px_rgba(220,38,38,.7)] font-bold',
  success: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white hover:brightness-110 shadow-[0_12px_28px_-12px_rgba(22,163,74,.7)] font-bold',
  outline: 'bg-white text-neutral-700 border border-neutral-300 hover:border-primary-300 hover:bg-neutral-50 dark:bg-white/5 dark:text-neutral-100 dark:border-white/15 dark:hover:bg-white/10 shadow-sm',
  light: 'bg-white text-primary-900 hover:bg-primary-50 active:bg-primary-100 shadow-[0_14px_30px_-12px_rgba(0,0,0,.45)] font-bold dark:bg-primary-900 dark:text-primary-50 dark:hover:bg-primary-800 dark:active:bg-primary-950',
};

const sizes: Record<Size, string> = {
  sm: 'text-[13px] px-3 py-1.5 rounded-xl',
  md: 'text-sm px-4 py-2.5 rounded-2xl',
  lg: 'text-[15px] px-5 py-3.5 rounded-2xl',
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
  const classes = `inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.98] ${variants[variant]} ${sizes[size]} ${full ? 'w-full' : ''} ${className}`;
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