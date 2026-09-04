import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import {
  Phone, MessageCircle, MapPin, Plus, Snowflake, Pencil, Wallet, Wrench, Trash2,
} from 'lucide-react';
import { formatBRL, formatDate, telToWhats, onlyDigits } from '../lib/utils';

export default function ClienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const customer = useLiveQuery(() => db.customers.get(id!), [id]);
  const equipment = useLiveQuery(() => db.equipment.where('customerId').equals(id!).toArray(), [id]) || [];
  const orders = useLiveQuery(() => db.serviceOrders.where('customerId').equals(id!).toArray(), [id]) || [];
  const budgets = useLiveQuery(() => db.budgets.where('customerId').equals(id!).toArray(), [id]) || [];

  const [showAddEq, setShowAddEq] = useState(false);
  const [editingEqId, setEditingEqId] = useState<string | null>(null);
  const [eqForm, setEqForm] = useState({
    brand: '', model: '', type: 'Split Higien Wall', btus: 9000, serial: '',
    installLocation: '', installDate: '', warranty: '', notes: '',
  });

  if (!customer) return null;

  const done = orders.filter((o) => o.status === 'concluido');
  const totalGasto = done.reduce((s, o) => s + o.value, 0);
  const lastVisit = done.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

  const emptyEqForm = { brand: '', model: '', type: 'Split Higien Wall', btus: 9000, serial: '', installLocation: '', installDate: '', warranty: '', notes: '' };

  function openAddEq() {
    setEditingEqId(null);
    setEqForm(emptyEqForm);
    setShowAddEq(true);
  }

  function openEditEq(eq: any) {
    setEditingEqId(eq.id);
    setEqForm({
      brand: eq.brand || '', model: eq.model || '', type: eq.type || 'Split Higien Wall', btus: eq.btus || 9000,
      serial: eq.serial || '', installLocation: eq.installLocation || '', installDate: eq.installDate || '',
      warranty: eq.warranty || '', notes: eq.notes || '',
    });
    setShowAddEq(true);
  }

  async function saveEquipment(e: React.FormEvent) {
    e.preventDefault();
    if (editingEqId) {
      await db.equipment.update(editingEqId, { ...eqForm });
      toast('success', 'Equipamento atualizado!');
    } else {
      await db.equipment.add({ ...eqForm, customerId: id!, photos: [], id: crypto.randomUUID() });
      toast('success', 'Equipamento adicionado!');
    }
    setShowAddEq(false);
    setEditingEqId(null);
    setEqForm(emptyEqForm);
  }

  async function removeOrder(orderId: string) {
    if (!confirm('Remover este serviço da linha do tempo?')) return;
    await db.serviceOrders.delete(orderId);
    toast('success', 'Serviço removido.');
  }

  async function removeBudget(budgetId: string) {
    if (!confirm('Remover este orçamento da linha do tempo?')) return;
    await db.budgets.delete(budgetId);
    toast('success', 'Orçamento removido.');
  }

  async function removeEquipment(equipmentId: string) {
    if (!confirm('Remover este equipamento?')) return;
    await db.equipment.delete(equipmentId);
    toast('success', 'Equipamento removido.');
  }

  async function deleteCustomer() {
    if (!confirm(`Excluir o cliente "${customer!.name}"?\n\nIsso remove também equipamentos, serviços e orçamentos dele.`)) return;
    const eqs = await db.equipment.where('customerId').equals(id!).toArray();
    await Promise.all(eqs.map((eq) => db.equipment.delete(eq.id)));
    const sos = await db.serviceOrders.where('customerId').equals(id!).toArray();
    await Promise.all(sos.map((o) => db.serviceOrders.delete(o.id)));
    const buds = await db.budgets.where('customerId').equals(id!).toArray();
    await Promise.all(buds.map((b) => db.budgets.delete(b.id)));
    await db.customers.delete(id!);
    toast('success', 'Cliente excluído.');
    navigate('/app/clientes');
  }

  return (
    <div className="max-w-3xl">
      <button type="button" onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400">← Voltar</button>

      <div className="rounded-3xl bg-white dark:bg-neutral-800 p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/40 text-2xl font-extrabold text-primary-700 dark:text-primary-300">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-neutral-800 dark:text-neutral-100">{customer.name}</h1>
              <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                <MapPin size={14} /> {customer.street}, {customer.number} - {customer.city}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/app/clientes/${customer.id}/editar`)}><Pencil size={16} /> Editar</Button>
            {(customer.whatsapp || customer.phone) && (
              <Button as="a" href={`https://wa.me/${telToWhats(customer.whatsapp || customer.phone)}`} target="_blank" rel="noreferrer" variant="success"><MessageCircle size={16} /> WhatsApp</Button>
            )}
            {customer.phone && (
              <Button as="a" href={`tel:${onlyDigits(customer.phone)}`} variant="outline" aria-label="Ligar para o cliente"><Phone size={16} /></Button>
            )}
            <Button variant="danger" onClick={deleteCustomer} aria-label="Excluir cliente" title="Excluir cliente"><Trash2 size={16} /></Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-700/40 p-3">
            <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{formatBRL(totalGasto)}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Total gasto</div>
          </div>
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-700/40 p-3">
            <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{done.length}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Serviços</div>
          </div>
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-700/40 p-3">
            <div className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{lastVisit ? formatDate(lastVisit.date) : '—'}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Último atendimento</div>
          </div>
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-700/40 p-3">
            <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{equipment.length}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Equipamentos</div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100">Equipamentos</h2>
        <Button variant="secondary" size="sm" onClick={openAddEq}>
          <Plus size={16} /> Adicionar
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {equipment.length === 0 && (
          <Card><p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum equipamento cadastrado.</p></Card>
        )}
        {equipment.map((eq) => (
          <Card key={eq.id}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                <Snowflake size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-neutral-800 dark:text-neutral-100">{eq.brand} {eq.model}</div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">{eq.type} · {eq.btus.toLocaleString('pt-BR')} BTUs</div>
                <div className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                  Serial: {eq.serial || '—'} · Local: {eq.installLocation || '—'} · Inst. {formatDate(eq.installDate)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEditEq(eq)}
                  className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/40 dark:hover:text-primary-300"
                  aria-label="Editar equipamento"
                  title="Editar equipamento"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => removeEquipment(eq.id)}
                  className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition hover:bg-danger/10 hover:text-danger dark:hover:bg-red-900/40 dark:hover:text-red-300"
                  aria-label="Remover equipamento"
                  title="Remover equipamento"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-neutral-800 dark:text-neutral-100">Linha do tempo</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate('/app/servicos/novo', { state: { customerId: customer.id } })}>
          <Plus size={16} /> Novo serviço
        </Button>
      </div>

      <div className="mt-4">
        {orders.length === 0 && budgets.length === 0 ? (
          <Card><p className="text-sm text-neutral-500 dark:text-neutral-400">Nenhum atendimento ainda.</p></Card>
        ) : (
          (() => {
            const events = [
              ...orders.map((o) => ({
                id: `svc-${o.id}`,
                date: o.date,
                title: o.service,
                sub: o.time ? `${o.time} · ${formatBRL(o.value)}` : formatBRL(o.value),
                kind: 'servico' as const,
                tone: o.status === 'concluido' ? 'bg-success'
                      : o.status === 'cancelado' ? 'bg-danger'
                      : o.status === 'agendado' || o.status === 'em_andamento' ? 'bg-primary-600 dark:bg-primary-500'
                      : 'bg-warning',
                render: () => <StatusBadge status={o.status} />,
                onClick: () => navigate(`/app/servicos/${o.id}`),
                onRemove: () => removeOrder(o.id),
              })),
              ...budgets.map((b) => ({
                id: `orc-${b.id}`,
                date: b.createdAt,
                title: `${b.serviceType} · orçamento`,
                sub: formatBRL(b.total),
                kind: 'orcamento' as const,
                tone: b.status === 'aprovado' ? 'bg-success'
                      : b.status === 'recusado' ? 'bg-danger'
                      : 'bg-primary-600 dark:bg-primary-500',
                render: () => (
                  <span className="rounded-full bg-neutral-100 dark:bg-neutral-700/60 px-2.5 py-1 text-xs font-medium capitalize text-neutral-700 dark:text-neutral-200">{b.status}</span>
                ),
                onClick: () => navigate(`/app/orcamentos/${b.id}`),
                onRemove: () => removeBudget(b.id),
              })),
            ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

            return (
              <ol className="relative border-l-2 border-neutral-200 dark:border-neutral-700 pl-5">
                {events.map((ev) => (
                  <li key={ev.id} className="relative pb-5 last:pb-0">
                    <span className={`absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white dark:ring-neutral-900 ${ev.tone}`} />
                    <div className="cursor-pointer rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3.5 shadow-card transition hover:border-primary-300 dark:hover:border-primary-500" onClick={ev.onClick}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-800 dark:text-neutral-100">
                            {ev.kind === 'servico' ? <Wrench size={15} className="text-primary-600 dark:text-primary-400" /> : <Wallet size={15} className="text-primary-600 dark:text-primary-400" />}
                            {ev.title}
                          </div>
                          <div className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                            {ev.date ? formatDate(ev.date) : '—'} · {ev.sub}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {ev.render()}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); ev.onRemove?.(); }}
                            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-danger/10 hover:text-danger dark:hover:bg-red-900/40 dark:hover:text-red-300"
                            aria-label="Apagar registro"
                            title="Apagar registro"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            );
          })()
        )}
      </div>

      <Modal open={showAddEq} onClose={() => { setShowAddEq(false); setEditingEqId(null); }} title={editingEqId ? 'Editar equipamento' : 'Adicionar equipamento'} wide>
        <form onSubmit={saveEquipment} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input aria-label="Marca" className="rounded-xl border border-neutral-300 dark:border-neutral-600 px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" placeholder="Marca" value={eqForm.brand} onChange={(e) => setEqForm({ ...eqForm, brand: e.target.value })} />
            <input aria-label="Modelo" className="rounded-xl border border-neutral-300 dark:border-neutral-600 px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" placeholder="Modelo" value={eqForm.model} onChange={(e) => setEqForm({ ...eqForm, model: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select aria-label="Tipo" className="rounded-xl border border-neutral-300 dark:border-neutral-600 px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100" value={eqForm.type} onChange={(e) => setEqForm({ ...eqForm, type: e.target.value })}>
              {['Split Higien Wall','Split Piso Teto','Split Cassete','Split Inverter','Janela','Multi Split','VRF / VRV'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <input type="number" inputMode="numeric" aria-label="BTUs" className="rounded-xl border border-neutral-300 dark:border-neutral-600 px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" placeholder="BTUs" value={eqForm.btus} onChange={(e) => setEqForm({ ...eqForm, btus: +e.target.value })} />
          </div>
          <input aria-label="Número de série" className="w-full rounded-xl border border-neutral-300 dark:border-neutral-600 px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" placeholder="Número de série" value={eqForm.serial} onChange={(e) => setEqForm({ ...eqForm, serial: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input aria-label="Local de instalação" className="rounded-xl border border-neutral-300 dark:border-neutral-600 px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" placeholder="Local de instalação" value={eqForm.installLocation} onChange={(e) => setEqForm({ ...eqForm, installLocation: e.target.value })} />
            <input type="date" aria-label="Data de instalação" className="rounded-xl border border-neutral-300 dark:border-neutral-600 px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" value={eqForm.installDate} onChange={(e) => setEqForm({ ...eqForm, installDate: e.target.value })} />
          </div>
          <input aria-label="Garantia" className="w-full rounded-xl border border-neutral-300 dark:border-neutral-600 px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" placeholder="Garantia (ex.: 12 meses)" value={eqForm.warranty} onChange={(e) => setEqForm({ ...eqForm, warranty: e.target.value })} />
          <input aria-label="Observações" className="w-full rounded-xl border border-neutral-300 dark:border-neutral-600 px-3 py-2.5 text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" placeholder="Observações" value={eqForm.notes} onChange={(e) => setEqForm({ ...eqForm, notes: e.target.value })} />
          <Button type="submit" full>{editingEqId ? 'Salvar alterações' : 'Salvar equipamento'}</Button>
        </form>
      </Modal>
    </div>
  );
}
