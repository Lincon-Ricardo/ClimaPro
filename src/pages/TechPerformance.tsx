import { useMemo, useState } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import {
  Trophy, TrendingUp, CheckCircle2, Calendar, DollarSign,
  Star, Award, Target, ChevronRight, ShieldCheck, Flame,
} from 'lucide-react';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { formatBRL, formatDate, todayISO } from '../lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function TechPerformance() {
  const { user } = useAuth();
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const company = companies[0];

  const techName = (user?.name || '').trim().toLowerCase();
  const techFirstName = (user?.firstName || '').trim().toLowerCase();

  // O dono define se há comissão e qual a taxa nas configurações da empresa
  const commissionEnabled = company?.commissionEnabled !== false;
  const commissionRate = company?.commissionRate !== undefined && company?.commissionRate !== null
    ? Number(company.commissionRate)
    : 15;

  const myOrders = useMemo(() => {
    return orders.filter((o) => {
      if (user?.role === 'admin') return true;
      const t = (o.technician || '').trim().toLowerCase();
      if (!t) return false;
      return t === techName || t === techFirstName || t.includes(techFirstName);
    });
  }, [orders, user, techName, techFirstName]);

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
    const checklistDoneCount = monthDone.filter((o) => (o.checklist || []).some((c: any) => c.done)).length;
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

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="Meu Desempenho"
        subtitle={`Acompanhe suas conquistas e comissões, ${user?.firstName}!`}
      />

      {/* Cartão de Nível / Gamificação */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-primary-800 p-5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Trophy size={26} className="text-amber-200" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-200">Classificação</div>
              <h2 className="text-xl font-black">{stats.level}</h2>
            </div>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
            Nível {stats.levelBadge}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-center">
          <div>
            <div className="text-xl font-extrabold">{stats.totalCompleted}</div>
            <div className="text-[11px] text-orange-100">OS Concluídas</div>
          </div>
          <div>
            <div className="text-xl font-extrabold">{stats.checklistRate}%</div>
            <div className="text-[11px] text-orange-100">Conformidade</div>
          </div>
          <div>
            <div className="text-xl font-extrabold">5.0 ⭐</div>
            <div className="text-[11px] text-orange-100">Avaliação</div>
          </div>
        </div>
      </div>

      {/* Cards Financeiros do Técnico (Definidos pela Empresa) */}
      {commissionEnabled ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Sua Comissão este Mês ({commissionRate}%)
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-800 dark:text-emerald-200">
                {formatBRL(stats.monthCommission)}
              </div>
              <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                Baseado em {stats.monthDone} atendimento(s) concluídos no mês
              </div>
            </Card>

            <Card className="border-primary-200 bg-primary-50/50 dark:border-primary-900/50 dark:bg-primary-950/20">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
                  Comissão de Hoje
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300">
                  <Flame size={18} />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-primary-800 dark:text-primary-200">
                {formatBRL(stats.todayCommission)}
              </div>
              <div className="mt-1 text-xs text-primary-600 dark:text-primary-400">
                {stats.todayDone} serviço(s) finalizados hoje
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between text-sm">
              <div>
                <div className="font-bold text-neutral-800 dark:text-neutral-100">Regra de Comissão da Empresa</div>
                <div className="text-xs text-neutral-500">Definida pelo responsável em Configurações da Empresa</div>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                {commissionRate}% por OS
              </span>
            </div>
          </Card>
        </>
      ) : (
        <Card className="border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="font-bold text-neutral-800 dark:text-neutral-100">Modelo de Remuneração Fixa</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Sua empresa não trabalha com modelo de comissão por OS. Seus ganhos seguem o contrato com a empresa.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Dicas de Excelência Operacional */}
      <Card>
        <div className="mb-2 flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-100">
          <ShieldCheck size={18} className="text-primary-600" /> Padrão de Qualidade ClimaPro
        </div>
        <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
          <li className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Sempre tire as fotos de <b>Antes, Durante e Depois</b> para validação da garantia.
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Colete a assinatura digital do cliente diretamente na tela antes de sair do local.
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Use o cálculo de Superaquecimento para garantir a carga ideal de fluido refrigerante.
          </li>
        </ul>
      </Card>
    </div>
  );
}
