import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

const base =
  'cp-field w-full rounded-2xl px-4 py-3 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 transition dark:text-white dark:placeholder:text-neutral-500';

type FieldProps = {
  label?: string;
  hint?: string;
  tone?: 'auto' | 'onDark';
};

function LabelText({ label, tone }: { label: string; tone: 'auto' | 'onDark' }) {
  if (tone === 'onDark') {
    return <span className="mb-1.5 block text-[13px] font-bold text-white/90">{label}</span>;
  }
  return <span className="mb-1.5 block text-[13px] font-bold text-neutral-700 dark:text-neutral-100">{label}</span>;
}

export function Input({ label, hint, tone = 'auto', className = '', ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label && <LabelText label={label} tone={tone} />}
      <input className={`${base} ${className}`} {...rest} />
      {hint && <span className={`mt-1 block text-xs ${tone === 'onDark' ? 'text-white/60' : 'text-neutral-400 dark:text-neutral-400'}`}>{hint}</span>}
    </label>
  );
}

export function Textarea({ label, hint, tone = 'auto', className = '', ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      {label && <LabelText label={label} tone={tone} />}
      <textarea className={`${base} resize-y ${className}`} {...rest} />
      {hint && <span className={`mt-1 block text-xs ${tone === 'onDark' ? 'text-white/60' : 'text-neutral-400 dark:text-neutral-400'}`}>{hint}</span>}
    </label>
  );
}

export function Select({ label, hint, tone = 'auto', className = '', children, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      {label && <LabelText label={label} tone={tone} />}
      <select className={`${base} ${className}`} {...rest}>
        {children}
      </select>
      {hint && <span className="mt-1 block text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}
