import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import {
  TrendingUp, Users, FileText, Target, Wallet, Wrench,
  CheckCircle2, Clock, XCircle, ChevronRight, UserRound, Activity,
} from 'lucide-react';
import { db } from '../lib/db';
import { Card, StatCard } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { formatBRL, formatDate } from '../lib/utils';

export default function Administrativo() {
  const navigate = useNavigate();
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const users = useLiveQuery(() => db.users.toArray(), []) || [];

  const stats = useMemo(() => {
    const concluded = orders.filter((o) => o.status === 'concluido');
    const revenueTotal = concluded.reduce((s, o) => s + o.value, 0);
    const cancelled = orders.filter((o) => o.status === 'cancelado').length;
    const pending = orders.filter((o) => !['concluido', 'cancelado'].includes(o.status)).length;
    const approved = budgets.filter((b) => b.status === 'aprovado').length;
    const totalBudget = budgets.length;
    const approvalRate = totalBudget ? Math.round((approved / totalBudget) * 100) : 0;
    const ticket = concluded.length ? revenueTotal / concluded.length : 0;
    const toReceive = orders.filter((o) => o.paymentStatus !== 'pago' && o.status !== 'cancelado').reduce((s, o) => s + o.value, 0);
    return { revenueTotal, cancelled, pending, approved, approvalRate, ticket, toReceive };
  }, [orders, budgets]);

  const byTechnician = useMemo(() => {
    const map = new Map<string, { count: number; done: number; revenue: number }>();
    orders.forEach((o) => {
      const t = o.technician || 'Sem técnico';
      const cur = map.get(t) || { count: 0, done: 0, revenue: 0 };
      cur.count += 1;
      if (o.status === 'concluido') {
        cur.done += 1;
        cur.revenue += o.value;
      }
      map.set(t, cur);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [orders]);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    orders
      .filter((o) => o.status === 'concluido' && o.date)
      .forEach((o) => {
        const m = o.date.slice(0, 7);
        map.set(m, (map.get(m) || 0) + o.value);
      });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [orders]);

  const maxMonth = monthly.length ? Math.max(...monthly.map(([, v]) => v)) : 1;
  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    return `${new Date(+y, +mo - 1, 1).toLocaleDateString('pt-BR', { month: 'short' })}`;
  };

  const statusDist = [
    { label: 'Concluídos', value: stats.revenueTotal ? orders.filter((o) => o.status === 'concluido').length : 0, color: 'bg-success' },
    { label: 'Pendentes', value: stats.pending, color: 'bg-orange-400' },
    { label: 'Cancelados', value: stats.cancelled, color: 'bg-danger' },
  ];
  const statusTotal = statusDist.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="max-w-5xl">
      <PageHeader title="Painel administrativo" subtitle="Visão do dono da empresa" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<TrendingUp size={20} />} label="Faturamento total" value={formatBRL(stats.revenueTotal)} />
        <StatCard icon={<Target size={20} />} color="text-success" bg="bg-green-50 dark:bg-green-900/30" label="Aprovação de orçamentos" value={`${stats.approvalRate}%`} />
        <StatCard icon={<Wallet size={20} />} color="text-warning" bg="bg-orange-50 dark:bg-orange-900/30" label="A receber" value={formatBRL(stats.toReceive)} />
        <StatCard icon={<Activity size={20} />} label="Ticket médio" value={formatBRL(stats.ticket)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <TrendingUp size={18} className="text-primary-600" /> Receita mensal
          </h2>
          {monthly.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-400">Sem dados ainda.</p>
          ) : (
            <div className="mt-4 flex h-40 items-end gap-3">
              {monthly.map(([m, v]) => (
                <div key={m} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400">{formatBRL(v).replace(/R\$\s?/, '')}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-primary-700 to-primary-400"
                    style={{ height: `${Math.max(8, (v / maxMonth) * 120)}px` }}
                  />
                  <span className="text-[10px] font-medium capitalize text-neutral-400">{monthLabel(m)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
            <Wrench size={18} className="text-primary-600" /> Distribuição de serviços
          </h2>
          <div className="mt-4 space-y-3">
            {statusDist.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-600 dark:text-neutral-300">{s.label}</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-100">{s.value}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-neutral-100 dark:bg-neutral-700">
                  <div className={`h-2 rounded-full ${s.color}`} style={{ width: `${(s.value / statusTotal) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-neutral-800 dark:text-neutral-100">
          <UserRound size={20} className="text-primary-600" /> Desempenho por técnico
        </h2>
        <span className="text-xs text-neutral-400">{users.length} usuário(s) cadastrado(s)</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {byTechnician.length === 0 && (
          <Card><p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum serviço vinculado a técnico ainda.</p></Card>
        )}
        {byTechnician.map(([name, t]) => (
          <Card key={name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-neutral-800 dark:text-neutral-100">{name}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{t.done} concluído(s) de {t.count}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-primary-700 dark:text-primary-300">{formatBRL(t.revenue)}</div>
              <div className="text-[10px] text-neutral-400">faturou</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card onClick={() => navigate('/app/users')} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 dark:bg-neutral-700/60 dark:text-neutral-300">
              <Users size={20} />
            </div>
            <div>
              <div className="font-bold text-neutral-800 dark:text-neutral-100">Gerenciar técnicos</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Cadastre e gerencie os usuários da sua equipe</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-neutral-400" />
        </Card>
      </div>
    </div>
  );
}
