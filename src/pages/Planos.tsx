import { useState } from 'react';
import {
  Check, Sparkles, Snowflake, Wind, Tornado, Crown, Zap, ShieldCheck,
  X, ChevronDown, Flame, BadgePercent, Headset,
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { PLANS, formatLimit, trialDaysLeft } from '../lib/plans';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { formatBRL } from '../lib/utils';

const PLAN_STYLE: Record<string, { icon: any; gradient: string; glow: string; accent: string }> = {
  start: {
    icon: <Snowflake size={26} />,
    gradient: 'from-sky-500 to-cyan-400',
    glow: 'shadow-sky-500/20',
    accent: 'text-sky-500',
  },
  pro: {
    icon: <Wind size={26} />,
    gradient: 'from-violet-600 via-primary-600 to-sky-500',
    glow: 'shadow-primary-500/40',
    accent: 'text-primary-500',
  },
  master: {
    icon: <Tornado size={26} />,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-orange-500/20',
    accent: 'text-orange-500',
  },
};

const COMPARISON: { label: string; values: (string | boolean)[] }[] = [
  { label: 'OS por mês', values: ['30', '150', 'Ilimitadas'] },
  { label: 'Técnicos', values: ['1', '5', 'Ilimitados'] },
  { label: 'Cockpit do técnico', values: [true, true, true] },
  { label: 'Laudo por voz', values: [false, true, true] },
  { label: 'Superaquecimento', values: [false, true, true] },
  { label: 'BI + ranking', values: [false, true, true] },
  { label: 'Cobrança WhatsApp', values: [false, true, true] },
  { label: 'Suporte prioritário', values: [false, true, true] },
  { label: 'API + multi-filial', values: [false, false, true] },
  { label: 'Gerente dedicado', values: [false, false, true] },
];

const FAQS: { q: string; a: string }[] = [
  { q: 'Preciso de cartão para testar?', a: 'Não. Os 14 dias grátis liberam o Pro completo sem pedir nenhum dado de pagamento.' },
  { q: 'Tem fidelidade ou multa?', a: 'Não. Assinatura mensal, cancele quando quiser e mantenha todos os seus dados e clientes.' },
  { q: 'Como pago?', a: 'Via Asaas: PIX (aprovação imediata), boleto ou cartão de crédito com cobrança recorrente.' },
  { q: 'O que acontece se eu estourar o limite?', a: 'Avisamos antes e você pode fazer upgrade em 1 clique, sem perder nada. O excedente nunca é apagado.' },
  { q: 'Meus técnicos pagam algo?', a: 'Não. Só o dono assina. Técnicos entram de graça dentro do limite do plano.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-bold text-neutral-800 dark:text-neutral-100"
      >
        {q}
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="border-t border-neutral-100 px-4 py-3 text-xs leading-relaxed text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">{a}</p>}
    </div>
  );
}

export default function Planos() {
  const toast = useToast();
  const { sub, plan, isTrial } = useSubscription();
  const [busy, setBusy] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);

  const left = sub ? trialDaysLeft(sub) : 0;
  const trialPct = Math.max(0, Math.min(100, ((14 - left) / 14) * 100));

  function price(p: number) {
    return annual ? p * 0.8 : p;
  }

  async function handleSubscribe(planKey: string) {
    setBusy(planKey);
    try {
      const waNumber = '5511999999999';
      const mode = annual ? 'ANUAL (-20%)' : 'MENSAL';
      const msg = `Olá! Quero assinar o ClimaPro no plano ${planKey.toUpperCase()} ${mode}. Pode me enviar o link de pagamento Asaas? ❄️`;
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
      toast('info', 'Abrimos o WhatsApp comercial. Complete sua assinatura por lá!');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-4">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-950 p-6 text-center text-white shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-[80%] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-200 backdrop-blur-sm">
            <Sparkles size={12} />
            {isTrial ? `Teste grátis · ${left} dias restantes` : `Plano atual: ${plan.name}`}
          </span>
          <h1 className="mx-auto mt-3 max-w-2xl text-2xl font-black leading-tight tracking-tight sm:text-4xl">
            Escolha a potência do seu frio <span className="bg-gradient-to-r from-sky-300 to-primary-300 bg-clip-text text-transparent">❄️</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-neutral-300 sm:text-sm">
            Sem fidelidade, sem taxa escondida. Cancele quando quiser e mantenha seus dados.
            PIX, boleto ou cartão pelo Asaas.
          </p>

          {isTrial && (
            <div className="mx-auto mt-4 max-w-md rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                <span className="flex items-center gap-1.5"><Flame size={14} /> Seu Pro grátis está acabando</span>
                <span>{left}/14 dias</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${trialPct}%` }} />
              </div>
            </div>
          )}

          {/* Toggle mensal/anual */}
          <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2 text-xs font-black transition ${!annual ? 'bg-white text-neutral-900 shadow' : 'text-neutral-300 hover:text-white'}`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-black transition ${annual ? 'bg-emerald-400 text-neutral-900 shadow' : 'text-neutral-300 hover:text-white'}`}
            >
              Anual <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${annual ? 'bg-neutral-900 text-emerald-300' : 'bg-emerald-500/20 text-emerald-300'}`}>-20%</span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-neutral-300">
            <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-400" /> 14 dias grátis</span>
            <span className="flex items-center gap-1"><Zap size={13} className="text-amber-300" /> Ativação imediata</span>
            <span className="flex items-center gap-1"><Headset size={13} className="text-sky-300" /> Suporte em português</span>
          </div>
        </div>
      </div>

      {/* ── CARDS ── */}
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3 md:gap-5">
        {PLANS.map((p) => {
          const st = PLAN_STYLE[p.key];
          const current = plan.key === p.key && !isTrial;
          const hl = p.highlight;
          return (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-3xl border bg-white p-5 transition-all dark:bg-neutral-900 sm:p-6 ${
                hl
                  ? 'border-transparent bg-gradient-to-b from-primary-600 via-primary-600 to-primary-700 p-[2px] shadow-2xl shadow-primary-500/40 md:-my-3 md:scale-[1.03]'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <div className={hl ? 'flex h-full flex-col rounded-[22px] bg-neutral-950 p-5 text-white sm:p-6' : 'flex h-full flex-col'}>
                {hl && (
                  <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 animate-pulse items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-neutral-900 shadow-lg">
                    <Crown size={12} /> Mais escolhido
                  </span>
                )}
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${st.gradient} ${st.glow}`}>
                  {st.icon}
                </div>
                <h2 className={`mt-3 text-xl font-black ${hl ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>{p.name}</h2>
                <p className={`text-xs ${hl ? 'text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}`}>{p.tagline}</p>
                <div className="mt-3 flex items-end gap-1">
                  {annual && (
                    <span className={`mr-1 pb-1 text-sm line-through ${hl ? 'text-neutral-400' : 'text-neutral-400'}`}>{formatBRL(p.price)}</span>
                  )}
                  <span className={`text-4xl font-black tracking-tight ${hl ? 'bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent' : 'text-neutral-900 dark:text-white'}`}>
                    {formatBRL(price(p.price))}
                  </span>
                  <span className={`pb-1.5 text-xs ${hl ? 'text-neutral-300' : 'text-neutral-400'}`}>/mês</span>
                </div>
                {annual && (
                  <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-500">
                    <BadgePercent size={12} /> {formatBRL(p.price * 12)} → {formatBRL(price(p.price) * 12)}/ano
                  </span>
                )}
                <div className={`mt-2 rounded-xl px-3 py-2 text-[11px] font-bold ${hl ? 'bg-white/10 text-primary-200' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                  {formatLimit(p.osPerMonth)} OS/mês · {formatLimit(p.technicians)} técnico(s)
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-xs ${hl ? 'text-neutral-200' : 'text-neutral-600 dark:text-neutral-300'}`}>
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <Check size={11} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  full
                  variant={hl ? 'light' : 'outline'}
                  className={`mt-5 font-black ${hl ? 'shadow-lg shadow-primary-500/30' : ''}`}
                  disabled={busy === p.key || current}
                  onClick={() => handleSubscribe(p.key)}
                >
                  {current ? '✓ Seu plano atual' : busy === p.key ? 'Abrindo...' : p.cta}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── COMPARATIVO ── */}
      <Card className="overflow-hidden p-0">
        <h2 className="px-4 pt-4 text-base font-black text-neutral-900 dark:text-white sm:px-5">Compare tudo, sem letra miúda</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="px-4 py-2.5 text-left font-semibold text-neutral-400 sm:px-5">Recurso</th>
                {PLANS.map((p) => (
                  <th key={p.key} className={`px-2 py-2.5 text-center font-black ${p.highlight ? 'text-primary-600 dark:text-primary-300' : 'text-neutral-600 dark:text-neutral-300'}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-neutral-50/60 dark:bg-neutral-900/40' : ''}>
                  <td className="px-4 py-2 font-medium text-neutral-600 dark:text-neutral-300 sm:px-5">{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className="px-2 py-2 text-center font-bold text-neutral-800 dark:text-neutral-100">
                      {typeof v === 'boolean' ? (
                        v ? <Check size={15} className="mx-auto text-emerald-500" /> : <X size={15} className="mx-auto text-neutral-300 dark:text-neutral-600" />
                      ) : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── FAQ ── */}
      <div>
        <h2 className="mb-2.5 text-base font-black text-neutral-900 dark:text-white">Perguntas frequentes</h2>
        <div className="space-y-2">
          {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </div>

      <Card className="border-dashed">
        <p className="text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          💡 <b>Como funciona:</b> você testa 14 dias grátis no <b>Clima Ideal (Pro)</b>. Depois escolhe o plano ideal.
          O pagamento é feito pelo Asaas (PIX, boleto ou cartão) e liberamos seu acesso automaticamente.
        </p>
      </Card>
    </div>
  );
}
