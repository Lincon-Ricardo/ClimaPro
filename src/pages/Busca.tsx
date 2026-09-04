import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { Search, Users, Wrench, Wallet } from 'lucide-react';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatBRL, formatDate } from '../lib/utils';

export default function Busca() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) || [];
  const equipment = useLiveQuery(() => db.equipment.toArray(), []) || [];

  const term = q.trim().toLowerCase();

  const foundCustomers = term
    ? customers.filter((c) =>
        (c.name + c.phone + c.city + c.street + c.document).toLowerCase().includes(term)
      )
    : [];
  const custMatches = new Set(foundCustomers.map((c) => c.id));

  const foundOrders = term
    ? orders.filter(
        (o) =>
          o.osNumber.toLowerCase().includes(term) ||
          o.address.toLowerCase().includes(term) ||
          o.service.toLowerCase().includes(term) ||
          custMatches.has(o.customerId) ||
          equipment.some((e) => e.customerId === o.customerId && (e.model + e.serial).toLowerCase().includes(term))
      )
    : [];

  const foundBudgets = term
    ? budgets.filter(
        (b) =>
          b.number.toLowerCase().includes(term) ||
          b.serviceType.toLowerCase().includes(term) ||
          custMatches.has(b.customerId)
      )
    : [];

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';
  const hasResults = foundCustomers.length + foundOrders.length + foundBudgets.length > 0;

  return (
    <div className="max-w-3xl">
      <PageHeader title="Busca" subtitle="Encontre clientes, serviços e orçamentos" />
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔎 Busque por cliente, telefone, OS, orçamento, endereço, modelo..."
        className="mb-5 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
      />

      {!term && (
        <EmptyState icon={<Search size={26} />} title="Digite algo para pesquisar" subtitle="Busque por nome, número ou endereço." />
      )}
      {term && !hasResults && (
        <EmptyState icon={<Search size={26} />} title="Nada encontrado" subtitle={`Nenhum resultado para “${q}”.`} />
      )}

      {term && foundCustomers.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100"><Users size={18} /> Clientes</h2>
          {foundCustomers.map((c) => {
            const cnt = orders.filter((o) => o.customerId === c.id).length;
            const last = orders.filter((o) => o.customerId === c.id && o.status === 'concluido').sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
            return (
              <Card key={c.id} onClick={() => navigate(`/app/clientes/${c.id}`)} className="mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">{c.name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1">
                    <div className="font-bold text-neutral-800 dark:text-neutral-100">{c.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {cnt} serviço(s) · Último atendimento: {last ? formatDate(last.date) : '—'} · {c.phone}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {term && foundOrders.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100"><Wrench size={18} /> Serviços</h2>
          {foundOrders.map((o) => (
            <Card key={o.id} onClick={() => navigate(`/app/servicos/${o.id}`)} className="mb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-neutral-800 dark:text-neutral-100">{custName(o.customerId)} <span className="text-xs font-medium text-neutral-400">{o.osNumber}</span></div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">❄️ {o.service} · {o.date ? formatDate(o.date) : '—'}</div>
                  <div className="text-xs text-neutral-400">{formatBRL(o.value)}</div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {term && foundBudgets.length > 0 && (
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100"><Wallet size={18} /> Orçamentos</h2>
          {foundBudgets.map((b) => (
            <Card key={b.id} onClick={() => navigate(`/app/orcamentos/${b.id}`)} className="mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-neutral-800 dark:text-neutral-100">{custName(b.customerId)} <span className="text-xs font-medium text-neutral-400">#{b.number}</span></div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">{b.serviceType}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-neutral-800 dark:text-neutral-100">{formatBRL(b.total)}</div>
                  <div className="text-xs text-neutral-400 capitalize">{b.status}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
