import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

export function BillingBanner() {
  const navigate = useNavigate();
  const { active, expired, isTrial, trialLeft, trialNotStarted, osBlocked, osThisMonth, osAllowed } = useSubscription();

  if (expired || !active) {
    return (
      <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-red-300 bg-red-50 p-3.5 dark:border-red-900/60 dark:bg-red-950/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <XCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <div className="text-sm font-black text-red-800 dark:text-red-200">Teste grátis encerrado</div>
            <p className="text-xs text-red-700 dark:text-red-300">Escolha um plano para voltar a criar. Leitura e PDFs continuam liberados.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/expirado')}
          className="flex shrink-0 items-center justify-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
        >
          Ver planos <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  if (isTrial && trialNotStarted) {
    return (
      <button
        type="button"
        onClick={() => navigate('/app/planos')}
        className="mb-4 flex w-full items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-left transition hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          <Sparkles size={15} /> Ganhe 14 dias grátis no Pro — crie sua 1ª OS para começar
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-black text-emerald-700 dark:text-emerald-300">
          Ver planos <ArrowRight size={13} />
        </span>
      </button>
    );
  }

  if (isTrial && trialLeft <= 5) {
    return (
      <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <div className="text-sm font-black text-amber-800 dark:text-amber-200">
              {trialLeft > 0 ? `Teste grátis termina em ${trialLeft} dia(s)` : 'Teste grátis terminou hoje'}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">Escolha um plano para não perder o acesso nem seus dados.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/planos')}
          className="flex shrink-0 items-center justify-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600"
        >
          Ver planos <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  if (isTrial) {
    return (
      <button
        type="button"
        onClick={() => navigate('/app/planos')}
        className="mb-4 flex w-full items-center justify-between gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-3.5 py-2.5 text-left transition hover:bg-primary-100 dark:border-primary-900/50 dark:bg-primary-950/30"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-primary-800 dark:text-primary-200">
          <Sparkles size={15} /> Testando o Clima Ideal Pro · {trialLeft} dias grátis restantes
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-black text-primary-700 dark:text-primary-300">
          Ver planos <ArrowRight size={13} />
        </span>
      </button>
    );
  }

  if (osBlocked) {
    return (
      <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-orange-300 bg-orange-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-bold text-orange-800">
          ⚠️ Limite do plano atingido: {osThisMonth}/{osAllowed} OS este mês. Faça upgrade para continuar.
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/planos')}
          className="shrink-0 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white"
        >
          Fazer upgrade
        </button>
      </div>
    );
  }

  return null;
}
