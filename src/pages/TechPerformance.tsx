import { useMemo } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useAuth } from '../context/AuthContext';
import { useMyOrders } from '../hooks/useTechOrders';
import { db } from '../lib/db';
import {
  Trophy, CheckCircle2, DollarSign,
  ShieldCheck, Flame,
} from 'lucide-react';
import { Card } from '../components/Card';
import { formatBRL, todayISO } from '../lib/utils';
import { format } from 'date-fns';

export default function TechPerformance() {
  const { user } = useAuth();
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const company = companies[0];

  const commissionEnabled = company?.commissionEnabled !== false;
  const commissionRate = company?.commissionRate !== undefined && company?.commissionRate !== null
    ? Number(company.commissionRate)
    : 15;

  const myOrders = useMyOrders(orders);

  const currentMonthISO = format(new Date(), 'yyyy-MM');

  const stats = useMemo(() => {
    const today = todayISO();
    const doneTotal = myOrders.filter((o) => o.status === 'concluido');

    // Hoje
    const todayDone = doneTotal.filter((o) => o.date === today);
    const todayValue = todayDone.reduce((acc, o) => acc + (Number(o.value) || 0), 0);
    const todayCommission = (todayValue * commissionRate) / 100;

    // Mes Atual
    const monthDone = doneTotal.filter((o) => (o.date || '').startsWith(currentMonthISO));
    const monthValue = monthDone.reduce((acc, o) => acc + (Number(o.value) || 0), 0);
    const monthCommission = (monthValue * commissionRate) / 100;

    // Pontualidade / Checklist (gamificacao)
    const checklistDoneCount = monthDone.filter((o) => (o.checklist || []).some((c) => c.done)).length;
    const checklistRate = monthDone.length > 0 ? Math.round((checklistDoneCount / monthDone.length) * 100) : 100;

    // Nivel do Tecnico
    let level = 'Técnico Especialista';
    let levelBadge = 'Ouro';
    if (doneTotal.length < 10) {
      level = 'Técnico Iniciante';
      levelBadge = 'Bronze';
    } else if (doneTotal.length < 30) {
      level = 'Técnico Pleno';
      levelBadge = 'Prata';
    }

    return {
      todayDone: todayDone.length,
      todayCommission,
      monthDone: monthDone.length,
      monthValue,
      monthCommission,
      checklistRate,
      level,
      levelBadge,
      totalCompleted: doneTotal.length,
    };
  }, [myOrders, commissionRate, currentMonthISO]);

  const companyName = company?.name?.trim() || 'ClimaPro';

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-3 sm:space-y-4">
      <div className="mb-1">
        <h1 className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100 sm:text-xl">Meu Desempenho</h1>
        <p className="break-words text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
          {user?.firstName}, aqui estão suas conquistas na <b>{companyName}</b>
        </p>
      </div>

      {/* Cartão de Nível / Gamificação */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-primary-800 p-4 text-white shadow-md sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm sm:h-12 sm:w-12">
              <Trophy size={22} className="text-amber-200" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-orange-200 sm:text-xs">Classificação · {companyName}</div>
              <h2 className="break-words text-base font-black leading-tight sm:text-xl">{stats.level}</h2>
            </div>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm sm:px-3 sm:text-xs">
            {stats.levelBadge}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-white/20 pt-2.5 text-center sm:mt-4 sm:gap-2 sm:pt-3">
          <div className="min-w-0">
            <div className="text-base font-extrabold sm:text-xl">{stats.totalCompleted}</div>
            <div className="truncate text-[10px] text-orange-100 sm:text-[11px]">OS Concluídas</div>
          </div>
          <div className="min-w-0">
            <div className="text-base font-extrabold sm:text-xl">{stats.checklistRate}%</div>
            <div className="truncate text-[10px] text-orange-100 sm:text-[11px]">Conformidade</div>
          </div>
          <div className="min-w-0">
            <div className="text-base font-extrabold sm:text-xl">5.0 ⭐</div>
            <div className="truncate text-[10px] text-orange-100 sm:text-[11px]">Avaliação</div>
          </div>
        </div>
      </div>

      {/* Cards Financeiros do Técnico (Definidos pela Empresa) */}
      {commissionEnabled ? (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            <Card className="border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 sm:text-xs">
                  Comissão no mês ({commissionRate}%)
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="mt-1.5 break-words text-xl font-black leading-tight text-emerald-800 dark:text-emerald-200 sm:mt-2 sm:text-2xl">
                {formatBRL(stats.monthCommission)}
              </div>
              <div className="mt-1 break-words text-[11px] leading-snug text-emerald-600 dark:text-emerald-400 sm:text-xs">
                {stats.monthDone} atendimento(s) concluídos · {companyName}
              </div>
            </Card>

            <Card className="border-primary-200 bg-primary-50/50 p-3 dark:border-primary-900/50 dark:bg-primary-950/20 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300 sm:text-xs">
                  Comissão de hoje
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300">
                  <Flame size={18} />
                </div>
              </div>
              <div className="mt-1.5 break-words text-xl font-black leading-tight text-primary-800 dark:text-primary-200 sm:mt-2 sm:text-2xl">
                {formatBRL(stats.todayCommission)}
              </div>
              <div className="mt-1 break-words text-[11px] leading-snug text-primary-600 dark:text-primary-400 sm:text-xs">
                {stats.todayDone} serviço(s) finalizados hoje
              </div>
            </Card>
          </div>

          <Card className="p-3 sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="break-words text-sm font-bold text-neutral-800 dark:text-neutral-100">Regra da {companyName}</div>
                <div className="break-words text-[11px] text-neutral-500 sm:text-xs">Definida pelo responsável da empresa</div>
              </div>
              <span className="w-fit shrink-0 whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                {commissionRate}% por OS
              </span>
            </div>
          </Card>
        </>
      ) : (
        <Card className="border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/40 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <div className="break-words text-sm font-bold text-neutral-800 dark:text-neutral-100">Remuneração fixa · {companyName}</div>
              <div className="mt-0.5 break-words text-[11px] leading-snug text-neutral-500 dark:text-neutral-400 sm:text-xs">
                A {companyName} não trabalha com comissão por OS. Seus ganhos seguem o contrato com a empresa.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Padrão de qualidade da empresa */}
      <Card className="p-3 sm:p-4">
        <div className="mb-2 flex items-start gap-2">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary-600" />
          <div className="min-w-0">
            <div className="break-words text-sm font-bold leading-snug text-neutral-800 dark:text-neutral-100 sm:text-base">
              Padrão de qualidade {companyName}
            </div>
            <div className="break-words text-[11px] text-neutral-400 sm:text-xs">
              Siga este checklist em todo atendimento da empresa
            </div>
          </div>
        </div>
        <ul className="space-y-2 text-[11px] leading-snug text-neutral-600 dark:text-neutral-300 sm:text-xs">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
            <span>Sempre tire as fotos de <b>Antes, Durante e Depois</b> para validação da garantia da {companyName}.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
            <span>Colete a assinatura digital do cliente na tela antes de sair do local.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
            <span>Use o cálculo de Superaquecimento para garantir a carga ideal de fluido refrigerante.</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
