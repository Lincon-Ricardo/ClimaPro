import { useState } from 'react';
import { Check, Sparkles, Snowflake, Wind, Tornado, Crown } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { PLANS, formatLimit, trialDaysLeft } from '../lib/plans';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { formatBRL } from '../lib/utils';

const PLAN_ICONS: Record<string, any> = {
  start: <Snowflake size={26} />,
  pro: <Wind size={26} />,
  master: <Tornado size={26} />,
};

export default function Planos() {
  const toast = useToast();
  const { sub, plan, isTrial } = useSubscription();
  const [busy, setBusy] = useState<string | null>(null);

  const left = sub ? trialDaysLeft(sub) : 0;

  async function handleSubscribe(planKey: string) {
    setBusy(planKey);
    try {
      const waNumber = '5511999999999';
      const msg = `Olá! Quero assinar o ClimaPro no plano ${planKey.toUpperCase()}. Minha empresa: ${planKey}. Pode me enviar o link de pagamento Asaas? ❄️`;
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, '_blank');
      toast('info', 'Abrimos o WhatsApp comercial. Complete sua assinatura por lá!');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
          <Sparkles size={13} /> {isTrial ? `Você está no teste grátis (${left} dias restantes)` : `Plano atual: ${plan.name}`}
        </span>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          Escolha a potência do seu frio ❄️
        </h1>
        <p className="mx-auto mt-1 max-w-xl text-sm text-neutral-500 dark:text-neutral-400">
          Sem fidelidade, sem taxa escondida. Cancele quando quiser e mantenha seus dados.
          Pagamento via PIX, boleto ou cartão pelo Asaas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const current = plan.key === p.key && !isTrial;
          return (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-3xl border-2 p-5 transition-all ${
                p.highlight
                  ? 'border-primary-600 bg-gradient-to-b from-primary-50 to-white shadow-xl dark:from-primary-950/60 dark:to-neutral-900'
                  : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-primary-700 px-3.5 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-md">
                  <Crown size={12} /> Mais escolhido
                </span>
              )}
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${p.highlight ? 'bg-primary-700 text-white' : 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'}`}>
                {PLAN_ICONS[p.key]}
              </div>
              <h2 className="mt-3 text-xl font-black text-neutral-900 dark:text-white">{p.name}</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{p.tagline}</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-3xl font-black text-neutral-900 dark:text-white">{formatBRL(p.price)}</span>
                <span className="pb-1 text-xs text-neutral-400">/mês</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-neutral-500">
                {formatLimit(p.osPerMonth)} OS/mês · {formatLimit(p.technicians)} técnico(s)
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <Check size={11} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                full
                variant={p.highlight ? 'primary' : 'outline'}
                className="mt-5"
                disabled={busy === p.key || current}
                onClick={() => handleSubscribe(p.key)}
              >
                {current ? '✓ Plano atual' : busy === p.key ? 'Abrindo...' : p.cta}
              </Button>
            </div>
          );
        })}
      </div>

      <Card className="border-dashed">
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          💡 <b>Como funciona:</b> você testa 14 dias grátis no <b>Clima Ideal (Pro)</b>. Depois escolhe o plano ideal.
          O pagamento é feito pelo Asaas (PIX, boleto ou cartão) e liberamos seu acesso automaticamente.
          Dúvidas? Fale com a gente no WhatsApp comercial.
        </p>
      </Card>
    </div>
  );
}
