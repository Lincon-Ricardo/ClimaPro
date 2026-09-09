import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snowflake, ShieldCheck, Zap, Headset } from 'lucide-react';

export function AuthLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  const navigate = useNavigate();
  return (
    <div className="auth-shell flex min-h-screen flex-col bg-[#071f4c] dark:bg-[#040814] lg:flex-row">
      <div className="auth-grid pointer-events-none absolute inset-0" />
      <div className="relative hidden flex-1 flex-col justify-between p-10 lg:flex">
        <button type="button" onClick={() => navigate('/login')} className="flex w-fit items-center gap-3">
          <span className="cp-float flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Snowflake size={26} className="text-white" />
          </span>
          <span className="text-left leading-tight">
            <span className="font-display block text-2xl font-extrabold text-white">ClimaPro</span>
            <span className="block text-xs font-medium text-sky-200/80">Gestão em climatização</span>
          </span>
        </button>
        <div className="max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-200 backdrop-blur">
            <Zap size={12} /> 14 dias grátis · sem cartão
          </span>
          <h2 className="font-display mt-4 text-4xl font-extrabold leading-[1.05] text-white">
            Sua refrigeração<br />no <span className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-transparent">piloto automático</span>
          </h2>
          <div className="mt-6 space-y-2.5 text-sm text-sky-100/90">
            <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-300" /> Garantia de 7 dias, sem fidelidade</p>
            <p className="flex items-center gap-2"><Zap size={16} className="text-amber-300" /> OS, orçamento e cobrança em 1 clique</p>
            <p className="flex items-center gap-2"><Headset size={16} className="text-sky-300" /> Suporte em português no WhatsApp</p>
          </div>
        </div>
        <p className="text-xs text-white/50">ClimaPro · CNPJ 00.000.000/0001-00 · contato@climapro.app</p>
      </div>
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-center gap-2 pt-8 lg:hidden">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <Snowflake size={22} className="text-white" />
          </span>
          <span className="font-display text-xl font-extrabold text-white">ClimaPro</span>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-8">
          <div className="cp-rise">
            <h1 className="font-display text-[28px] font-extrabold leading-tight text-white">{title}</h1>
            <p className="mt-1 text-sm text-sky-200/90">{subtitle}</p>
          </div>
          <div className="cp-rise cp-rise-1 mt-5">{children}</div>
          <div className="cp-rise cp-rise-2 mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[11px] font-medium text-sky-200/80">
            <button type="button" onClick={() => navigate('/termos')} className="hover:text-white hover:underline">Termos</button>
            <button type="button" onClick={() => navigate('/privacidade')} className="hover:text-white hover:underline">Privacidade</button>
            <button type="button" onClick={() => navigate('/reembolso')} className="hover:text-white hover:underline">Reembolso 7 dias</button>
          </div>
        </div>
      </div>
    </div>
  );
}
