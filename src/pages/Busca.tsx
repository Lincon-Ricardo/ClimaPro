import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Wrench, Wallet } from 'lucide-react';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { useDebouncedValue } from '../hooks/usePagedList';
import { formatBRL, formatDate } from '../lib/utils';
import type { Budget, Customer, Equipment, ServiceOrder } from '../types';

export default function Busca() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const term = useDebouncedValue(q.trim(), 400);
  const [loading, setLoading] = useState(false);
  const [foundCustomers, setFoundCustomers] = useState<Customer[]>([]);
  const [foundOrders, setFoundOrders] = useState<ServiceOrder[]>([]);
  const [foundBudgets, setFoundBudgets] = useState<Budget[]>([]);
  const [custNames, setCustNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    if (!term) {
      setFoundCustomers([]); setFoundOrders([]); setFoundBudgets([]); setCustNames({});
      return;
    }
    setLoading(true);
    (async () => {
      const [custs, ords, buds] = await Promise.all([
        db.customers.list({ pageSize: 8, orIlike: { columns: ['name', 'phone', 'city', 'document'], term } }).then((r) => r.rows),
        db.serviceOrders.list({ pageSize: 8, orIlike: { columns: ['osNumber', 'service', 'address'], term } }).then((r) => r.rows),
        db.budgets.list({ pageSize: 8, orIlike: { columns: ['number', 'serviceType'], term } }).then((r) => r.rows),
      ]);
      let extraOrders: ServiceOrder[] = [];
      let extraBudgets: Budget[] = [];
      let extraEqs: Equipment[] = [];
      if (custs.length > 0) {
        const ids = custs.map((c) => c.id);
        [extraOrders, extraBudgets, extraEqs] = await Promise.all([
          Promise.all(ids.slice(0, 8).map((id) => db.serviceOrders.where('customerId').equals(id).toArray().catch(() => [] as ServiceOrder[]))).then((a) => a.flat().slice(0, 8)),
          Promise.all(ids.slice(0, 8).map((id) => db.budgets.where('customerId').equals(id).toArray().catch(() => [] as Budget[]))).then((a) => a.flat().slice(0, 8)),
          Promise.all(ids.slice(0, 8).map((id) => db.equipment.where('customerId').equals(id).toArray().catch(() => [] as Equipment[]))).then((a) => a.flat().slice(0, 24)),
        ]);
      }
      if (extraEqs.length > 0) {
        const t = term.toLowerCase();
        const eqCustomerIds = new Set(extraEqs.filter((e) => ((e.model || '') + (e.serial || '') + (e.brand || '')).toLowerCase().includes(t)).map((e) => e.customerId));
        if (eqCustomerIds.size > 0) {
          const more = await Promise.all([...eqCustomerIds].slice(0, 4).map((id) => db.serviceOrders.where('customerId').equals(id).toArray().catch(() => [] as ServiceOrder[])));
          extraOrders = [...extraOrders, ...more.flat()].slice(0, 10);
        }
      }
      const orderMap = new Map<string, ServiceOrder>();
      [...ords, ...extraOrders].forEach((o) => orderMap.set(o.id, o));
      const budgetMap = new Map<string, Budget>();
      [...buds, ...extraBudgets].forEach((b) => budgetMap.set(b.id, b));
      const allCustomerIds = [...new Set([...custs.map((c) => c.id), ...orderMap.values()].map((o) => (o as ServiceOrder).customerId).concat([...budgetMap.values()].map((b) => (b as Budget).customerId)))].filter(Boolean).slice(0, 30);
      const names: Record<string, string> = {};
      custs.forEach((c) => { names[c.id] = c.name; });
      await Promise.all(allCustomerIds.filter((id) => !names[id]).map((id) => db.customers.get(id).then((c) => { if (c) names[id] = (c as Customer).name; }).catch(() => undefined)));
      if (!alive) return;
      setFoundCustomers(custs);
      setFoundOrders([...orderMap.values()].slice(0, 10));
      setFoundBudgets([...budgetMap.values()].slice(0, 10));
      setCustNames(names);
      setLoading(false);
    })().catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [term]);

  const custName = (id: string) => custNames[id] || 'Cliente';
  const hasResults = foundCustomers.length + foundOrders.length + foundBudgets.length > 0;

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <PageHeader title="Busca" subtitle="Servidor: top 8 por entidade + cruzamento por cliente" />
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
      {term && loading && <Loading />}
      {term && !loading && !hasResults && (
        <EmptyState icon={<Search size={26} />} title="Nada encontrado" subtitle={`Nenhum resultado para “${q}”.`} />
      )}
      {term && !loading && foundCustomers.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-neutral-800 dark:text-neutral-100"><Users size={18} /> Clientes</h2>
          {foundCustomers.map((c) => (
            <Card key={c.id} onClick={() => navigate(`/app/clientes/${c.id}`)} className="mb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">{c.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1">
                  <div className="font-bold text-neutral-800 dark:text-neutral-100">{c.name}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{c.city || ''} · {c.phone}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {term && !loading && foundOrders.length > 0 && (
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
      {term && !loading && foundBudgets.length > 0 && (
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
