import { Snowflake } from 'lucide-react';

export function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-primary-700">
        <Snowflake size={28} className="text-white" />
      </div>
      <div className="text-sm font-medium text-neutral-500">Carregando ClimaPro...</div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}
