import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import Modal from './_Modal';
import {
  Phone, MessageCircle, MapPin, Plus, Snowflake, Pencil, Wallet, Wrench,
} from 'lucide-react';
import { formatBRL, formatDate, telToWhats } from '../lib/utils';

export default function ClienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const customer = useLiveQuery(() => db.customers.get(id!), [id]);
  const equipment = useLiveQuery(() => db.equipment.where('customerId').equals(id!).toArray(), [id]) || [];
  const orders = useLiveQuery(() => db.serviceOrders.where('customerId').equals(id!).toArray(), [id]) || [];
  const budgets = useLiveQuery(() => db.budgets.where('customerId').equals(id!).toArray(), [id]) || [];

  const [showAddEq, setShowAddEq] = useState(false);
  const [eqForm, setEqForm] = useState({
    brand: '', model: '', type: 'Split Higien Wall', btus: 9000, serial: '',
    installLocation: '', installDate: '', warranty: '', notes: '',
  });

  if (!customer) return null;

  const done = orders.filter((o) => o.status === 'concluido');
  const totalGasto = done.reduce((s, o) => s + o.value, 0);
  const lastVisit = done.slice().sort((a, b) => b.date.localeCompare(a.date))[0];

  async function saveEquipment(e: React.FormEvent) {
    e.preventDefault();
    await db.equipment.add({ ...eqForm, customerId: id!, photos: [], id: crypto.randomUUID() });
    setShowAddEq(false);
    setEqForm({ brand: '', model: '', type: 'Split Higien Wall', btus: 9000, serial: '', installLocation: '', installDate: '', warranty: '', notes: '' });
    toast('success', 'Equipamento adicionado!');
  }

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-neutral-500 hover:text-primary-600">← Voltar</button>

      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-2xl font-extrabold text-primary-700">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-neutral-800">{customer.name}</h1>
              <div className="flex items-center gap-1 text-sm text-neutral-500">
                <MapPin size={14} /> {customer.street}, {customer.number} - {customer.city}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`https://wa.me/${telToWhats(customer.phone)}`} target="_blank" rel="noreferrer">
              <Button variant="success"><MessageCircle size={16} /> WhatsApp</Button>
            </a>
            <a href={`tel:${customer.phone}`}>
              <Button variant="outline"><Phone size={16} /></Button>
            </a>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-neutral-50 p-3">
            <div className="text-lg font-bold text-neutral-800">{formatBRL(totalGasto)}</div>
            <div className="text-xs text-neutral-500">Total gasto</div>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3">
            <div className="text-lg font-bold text-neutral-800">{done.length}</div>
            <div className="text-xs text-neutral-500">Serviços</div>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3">
            <div className="text-sm font-bold text-neutral-800">{lastVisit ? formatDate(lastVisit.date) : '—'}</div>
            <div className="text-xs text-neutral-500">Último atendimento</div>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3">
            <div className="text-lg font-bold text-neutral-800">{equipment.length}</div>
            <div className="text-xs text-neutral-500">Equipamentos</div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-neutral-800">Equipamentos</h2>
        <Button variant="secondary" size="sm" onClick={() => setShowAddEq(true)}>
          <Plus size={16} /> Adicionar
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {equipment.length === 0 && (
          <Card><p className="text-sm text-neutral-500">Nenhum equipamento cadastrado.</p></Card>
        )}
        {equipment.map((eq) => (
          <Card key={eq.id}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
                <Snowflake size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-neutral-800">{eq.brand} {eq.model}</div>
                <div className="text-sm text-neutral-500">{eq.type} · {eq.btus.toLocaleString('pt-BR')} BTUs</div>
                <div className="mt-1 text-xs text-neutral-400">
                  Serial: {eq.serial || '—'} · Local: {eq.installLocation || '—'} · Inst. {formatDate(eq.installDate)}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-neutral-800">Linha do tempo</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate('/app/servicos/novo', { state: { customerId: customer.id } })}>
          <Plus size={16} /> Novo serviço
        </Button>
      </div>

      <div className="mt-4">
        {orders.length === 0 && budgets.length === 0 ? (
          <Card><p className="text-sm text-neutral-500">Nenhum atendimento ainda.</p></Card>
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
                      : o.status === 'agendado' || o.status === 'em_andamento' ? 'bg-primary-600'
                      : 'bg-warning',
                render: () => <StatusBadge status={o.status} />,
                onClick: () => navigate(`/app/servicos/${o.id}`),
              })),
              ...budgets.map((b) => ({
                id: `orc-${b.id}`,
                date: b.createdAt,
                title: `${b.serviceType} · orçamento`,
                sub: formatBRL(b.total),
                kind: 'orcamento' as const,
                tone: b.status === 'aprovado' ? 'bg-success'
                      : b.status === 'recusado' ? 'bg-danger'
                      : 'bg-primary-600',
                render: () => (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium capitalize text-neutral-700">{b.status}</span>
                ),
                onClick: () => navigate(`/app/orcamentos/${b.id}`),
              })),
            ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

            return (
              <ol className="relative border-l-2 border-neutral-200 pl-5">
                {events.map((ev) => (
                  <li key={ev.id} className="relative pb-5 last:pb-0">
                    <span className={`absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${ev.tone}`} />
                    <div className="cursor-pointer rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-card transition hover:border-primary-300" onClick={ev.onClick}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-800">
                            {ev.kind === 'servico' ? <Wrench size={15} className="text-primary-600" /> : <Wallet size={15} className="text-primary-600" />}
                            {ev.title}
                          </div>
                          <div className="mt-0.5 text-sm text-neutral-500">
                            {ev.date ? formatDate(ev.date) : '—'} · {ev.sub}
                          </div>
                        </div>
                        {ev.render()}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            );
          })()
        )}
      </div>

      <Modal open={showAddEq} onClose={() => setShowAddEq(false)} title="Adicionar equipamento" wide>
        <form onSubmit={saveEquipment} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Marca" value={eqForm.brand} onChange={(e) => setEqForm({ ...eqForm, brand: e.target.value })} />
            <input className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Modelo" value={eqForm.model} onChange={(e) => setEqForm({ ...eqForm, model: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={eqForm.type} onChange={(e) => setEqForm({ ...eqForm, type: e.target.value })}>
              {['Split Higien Wall','Split Piso Teto','Split Cassete','Split Inverter','Janela','Multi Split','VRF / VRV'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <input type="number" className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="BTUs" value={eqForm.btus} onChange={(e) => setEqForm({ ...eqForm, btus: +e.target.value })} />
          </div>
          <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Número de série" value={eqForm.serial} onChange={(e) => setEqForm({ ...eqForm, serial: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Local de instalação" value={eqForm.installLocation} onChange={(e) => setEqForm({ ...eqForm, installLocation: e.target.value })} />
            <input type="date" className="rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" value={eqForm.installDate} onChange={(e) => setEqForm({ ...eqForm, installDate: e.target.value })} />
          </div>
          <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Garantia (ex.: 12 meses)" value={eqForm.warranty} onChange={(e) => setEqForm({ ...eqForm, warranty: e.target.value })} />
          <input className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm" placeholder="Observações" value={eqForm.notes} onChange={(e) => setEqForm({ ...eqForm, notes: e.target.value })} />
          <Button type="submit" full>Salvar equipamento</Button>
        </form>
      </Modal>
    </div>
  );
}
