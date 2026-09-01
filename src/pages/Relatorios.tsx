import { useMemo } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { FileText, TrendingUp, XCircle, CheckCircle2, Users } from 'lucide-react';
import { db } from '../lib/db';
import { Card, StatCard } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { formatBRL } from '../lib/utils';

export default function Relatorios() {
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];

  const stats = useMemo(() => {
    const done = orders.filter((o) => o.status === 'concluido');
    const revenue = done.reduce((s, o) => s + o.value, 0);
    const cancelled = orders.filter((o) => o.status === 'cancelado').length;
    const approved = budgets.filter((b) => b.status === 'aprovado').length;
    const refused = budgets.filter((b) => b.status === 'recusado').length;
    const recurring = customers.filter((c) => orders.filter((o) => o.customerId === c.id).length > 1).length;
    return { done: done.length, revenue, cancelled, approved, refused, recurring };
  }, [orders, budgets, customers]);

  const byService = useMemo(() => {
    const map = new Map<string, number>();
    orders.filter((o) => o.status === 'concluido').forEach((o) => map.set(o.service, (map.get(o.service) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const rows = [
    { icon: <TrendingUp size={20} />, label: 'Faturamento', value: formatBRL(stats.revenue) },
    { icon: <FileText size={20} />, label: 'Serviços realizados', value: String(stats.done) },
    { icon: <XCircle size={20} />, label: 'Serviços cancelados', value: String(stats.cancelled) },
    { icon: <CheckCircle2 size={20} />, label: 'Orçamentos aprovados', value: String(stats.approved) },
    { icon: <XCircle size={20} />, label: 'Orçamentos recusados', value: String(stats.refused) },
    { icon: <Users size={20} />, label: 'Clientes recorrentes', value: String(stats.recurring) },
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader title="Relatórios" subtitle="Visão geral do seu negócio" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rows.map((r, i) => (
          <StatCard key={i} icon={r.icon} label={r.label} value={r.value} />
        ))}
      </div>
      <Card className="mt-6">
        <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">Serviços por categoria</h2>
        {byService.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">Sem dados ainda.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {byService.map(([name, count]) => (
              <div key={name} className="flex justify-between border-b border-neutral-100 pb-2 text-sm dark:border-neutral-800">
                <span className="text-neutral-600 dark:text-neutral-300">{name}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-100">{count} serviço(s)</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
