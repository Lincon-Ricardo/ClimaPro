import { useNavigate } from 'react-router-dom';
import { Wallet, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { formatBRL, formatDate } from '../lib/utils';
import { useState } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { usePagedList, useDebouncedValue } from '../hooks/usePagedList';
import { Loading } from '../components/Loading';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const STATUS_STYLE: Record<string, string> = {
  rascunho: 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300',
  enviado: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  aprovado: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  recusado: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export default function Orcamentos() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 350);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; number: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (!isAdmin) {
      toast('error', 'Somente o dono pode apagar orçamentos.');
      return;
    }
    setDeleting(true);
    try {
      await db.budgets.delete(deleteTarget.id);
      toast('success', 'Orçamento excluído!');
      setDeleteTarget(null);
    } catch {
      toast('error', 'Não foi possível excluir. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const custName = (id: string) => customers.find((c) => c.id === id)?.name || 'Cliente';
  const { rows: budgets, loading, loadingMore, hasMore, loadMore } = usePagedList(
    (p) => db.budgets.list({ ...p, pageSize: 20, order: { column: 'createdAt' }, ...(debounced ? { orIlike: { columns: ['number', 'serviceType'], term: debounced } } : {}) }),
    { ...(debounced ? { orIlike: { columns: ['number', 'serviceType'], term: debounced } } : {}) },
    20,
  );

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle="Busca por número/tipo no servidor + filtro cliente local"
        action={<Button onClick={() => navigate('/app/orcamentos/novo')}><Plus size={18} /> Novo</Button>}
      />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por número ou tipo (ex.: Higienização)..."
        aria-label="Buscar orçamentos"
        className="mb-4 w-full rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm dark:text-neutral-100 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {loading ? <Loading /> : budgets.length === 0 ? (
        <EmptyState
          icon={<Wallet size={26} />}
          title="Nenhum orçamento"
          subtitle="Crie um orçamento profissional e envie ao cliente."
          action={<Button onClick={() => navigate('/app/orcamentos/novo')}><Plus size={18} /> Novo orçamento</Button>}
        />
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => (
            <Card key={b.id} onClick={() => navigate(`/app/orcamentos/${b.id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold text-neutral-800 dark:text-neutral-100">{custName(b.customerId)}</span>
                    <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">#{b.number}</span>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">{b.serviceType}</div>
                  <div className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">Criado em {formatDate(b.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{formatBRL(b.total)}</div>
                    <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status] || ''}`}>
                      {STATUS_LABEL[b.status] || b.status}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: b.id, number: b.number }); }}
                      className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/40 dark:hover:text-red-300"
                      title="Excluir orçamento (dono)"
                      aria-label={`Excluir orçamento ${b.number}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {hasMore && (
        <div className="mt-4 text-center">
          <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Carregando...' : 'Carregar mais'}</Button>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Excluir orçamento ${deleteTarget?.number || ''}?`}
        message="Essa ação não pode ser desfeita."
        busy={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
