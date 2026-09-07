import { useMemo, useState } from 'react';
import { TrendingUp, Wallet, CheckCircle2, Clock } from 'lucide-react';
import { Card, StatCard } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { formatBRL, todayISO, toISODate, asDateKey } from '../lib/utils';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Loading } from '../components/Loading';

type Range = 'hoje' | 'semana' | 'mes' | 'periodo';

export default function Financeiro() {
  const [range, setRange] = useState<Range>('mes');
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO());

  const { label, from, to } = useMemo(() => {
    const t = new Date();
    if (range === 'hoje') return { label: 'Hoje', from: todayISO(), to: todayISO() };
    if (range === 'semana') {
      const s = new Date(t);
      s.setDate(s.getDate() - s.getDay() + 1);
      return { label: 'Esta semana', from: toISODate(s), to: todayISO() };
    }
    if (range === 'mes') {
      const s = new Date(t.getFullYear(), t.getMonth(), 1);
      return { label: t.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), from: toISODate(s), to: todayISO() };
    }
    return { label: 'Período personalizado', from: start, to: end };
  }, [range, start, end]);

  const orders = useLiveQuery(() => db.serviceOrders.list({ pageSize: 1000, gte: { date: from }, lte: { date: to } }).then((r) => r.rows), [from, to]) || [];
  const allOrders = useLiveQuery(() => db.serviceOrders.list({ pageSize: 1000 }).then((r) => r.rows), []) || [];
  const payments = useLiveQuery(() => db.payments.list({ pageSize: 500, gte: { paidAt: from }, lte: { paidAt: to } }).then((r) => r.rows), [from, to]) || [];

  const periodOrders = orders.filter((o) => o.status !== 'cancelado');
  const revenue = periodOrders.reduce((s, o) => s + (Number(o.value) || 0), 0);
  const paymentsInPeriod = payments.filter((p) => p.status === 'pago' && p.paidAt && asDateKey(p.paidAt) >= from && asDateKey(p.paidAt) <= to);
  const paidIds = new Set(paymentsInPeriod.map((p) => p.serviceOrderId));
  const paidFromPayments = paymentsInPeriod.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const paidFromOrders = periodOrders
    .filter((o) => o.paymentStatus === 'pago' && !paidIds.has(o.id))
    .reduce((s, o) => s + (Number(o.value) || 0), 0);
  const paid = paidFromPayments + paidFromOrders;
  const toReceive = allOrders
    .filter((o) => o.paymentStatus !== 'pago' && o.status !== 'cancelado')
    .reduce((s, o) => s + (Number(o.value) || 0), 0);
  const doneCount = periodOrders.filter((o) => o.status === 'concluido').length;
  const pendingCount = periodOrders.filter((o) => o.status !== 'concluido').length;

  const byService = useMemo(() => {
    const map = new Map<string, number>();
    periodOrders.forEach((o) => map.set(o.service, (map.get(o.service) || 0) + (Number(o.value) || 0)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [periodOrders]);

  const loading = !orders || !allOrders;

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl">
      <PageHeader title="Financeiro" subtitle={`Filtrado no servidor: ${label} (${from} a ${to})`} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['hoje', 'semana', 'mes'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={range === r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${range === r ? 'bg-primary-700 text-white' : 'bg-white border border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}
            >
              {r === 'hoje' ? 'Hoje' : r === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={range === 'periodo'}
            onClick={() => setRange('periodo')}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${range === 'periodo' ? 'bg-primary-700 text-white' : 'bg-white border border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}
          >
            Período
          </button>
        </div>
        <div className="text-sm font-bold text-neutral-700 capitalize dark:text-neutral-200">{label}</div>
      </div>

      {range === 'periodo' && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input aria-label="Data inicial" type="date" className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600" value={start} onChange={(e) => setStart(e.target.value)} />
          <input aria-label="Data final" type="date" className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      )}

      {loading ? <Loading /> : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<TrendingUp size={20} />} label="Faturamento" value={formatBRL(revenue)} />
            <StatCard icon={<CheckCircle2 size={20} />} color="text-success" bg="bg-green-50 dark:bg-green-900/30" label="Recebido" value={formatBRL(paid)} />
            <StatCard icon={<Clock size={20} />} color="text-warning" bg="bg-orange-50 dark:bg-orange-900/30" label="A receber" value={formatBRL(toReceive)} />
            <StatCard icon={<Wallet size={20} />} label="Serviços" value={`${doneCount} concluídos`} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">Faturamento por serviço</h2>
              {byService.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-400">Sem dados neste período.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {byService.map(([name, val]) => {
                    const pct = revenue ? Math.round((val / revenue) * 100) : 0;
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-600 dark:text-neutral-300">{name}</span>
                          <span className="font-semibold text-neutral-800 dark:text-neutral-100">{formatBRL(val)}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-700/60">
                          <div className="h-2 rounded-full bg-primary-600 dark:bg-primary-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
            <Card>
              <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">Resumo</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between border-b border-neutral-100 pb-2 dark:border-neutral-800"><span className="text-neutral-500 dark:text-neutral-400">Serviços no período</span><b>{periodOrders.length}</b></div>
                <div className="flex justify-between border-b border-neutral-100 pb-2 dark:border-neutral-800"><span className="text-neutral-500 dark:text-neutral-400">Serviços pendentes</span><b>{pendingCount}</b></div>
                <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Ticket médio</span><b>{periodOrders.length ? formatBRL(revenue / periodOrders.length) : '—'}</b></div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
