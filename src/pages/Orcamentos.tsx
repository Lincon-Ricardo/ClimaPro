import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNavigate } from 'react-router-dom';
import { Wallet, Plus } from 'lucide-react';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { formatBRL, formatDate } from '../lib/utils';
import { useState } from 'react';

const STATUS_STYLE: Record<string, string> = {
  rascunho: 'bg-neutral-100 text-neutral-600',
  enviado: 'bg-blue-100 text-blue-700',
  aprovado: 'bg-green-100 text-green-700',
  recusado: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export default function Orcamentos() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const budgets = useLiveQuery(() => db.budgets.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];

  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';

  const filtered = budgets
    .filter((b) => (custName(b.customerId) + b.number).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle={`${budgets.length} orçamentos`}
        action={<Button onClick={() => navigate('/app/orcamentos/novo')}><Plus size={18} /> Novo</Button>}
      />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por cliente ou número..."
        className="mb-4 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wallet size={26} />}
          title="Nenhum orçamento"
          subtitle="Crie um orçamento profissional e envie ao cliente."
          action={<Button onClick={() => navigate('/app/orcamentos/novo')}><Plus size={18} /> Novo orçamento</Button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <Card key={b.id} onClick={() => navigate(`/app/orcamentos/${b.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-800">{custName(b.customerId)}</span>
                    <span className="text-xs font-medium text-neutral-400">#{b.number}</span>
                  </div>
                  <div className="mt-0.5 text-sm text-neutral-500">{b.serviceType}</div>
                  <div className="mt-0.5 text-xs text-neutral-400">Criado em {formatDate(b.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-neutral-800">{formatBRL(b.total)}</div>
                  <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] || ''}`}>
                    {STATUS_LABEL[b.status] || b.status}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
