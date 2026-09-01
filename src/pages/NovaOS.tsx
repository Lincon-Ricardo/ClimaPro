import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Button } from '../components/Button';
import { Input, Select, Textarea } from '../components/Fields';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { SERVICE_TYPES, toggleChecklistItem } from '../lib/utils';
import type { ChecklistItem } from '../types';

const DEFAULT_CHECKLIST = [
  'Equipamento desligado',
  'Filtros verificados',
  'Evaporadora higienizada',
  'Condensadora higienizada',
  'Dreno verificado',
  'Pressão verificada',
  'Teste realizado',
  'Equipamento funcionando',
];

export default function NovaOS() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];

  const preselect = (location.state as any)?.customerId || '';

  const [form, setForm] = useState({
    customerId: preselect,
    equipmentId: '',
    service: 'Higienização',
    problem: '',
    value: 0,
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
    technician: '',
    address: '',
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    DEFAULT_CHECKLIST.map((label) => ({ id: crypto.randomUUID(), label, done: false }))
  );

  const equipment = useLiveQuery(
    () => (form.customerId ? db.equipment.where('customerId').equals(form.customerId).toArray() : Promise.resolve([])),
    [form.customerId]
  ) || [];

  const customer = customers.find((c) => c.id === form.customerId);

  function toggle(id: string) {
    setChecklist((list) => toggleChecklistItem(list, id));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      toast('error', 'Selecione um cliente.');
      return;
    }
    await db.serviceOrders.add({
      id: crypto.randomUUID(),
      osNumber: `OS-${String(Date.now()).slice(-5)}`,
      customerId: form.customerId,
      equipmentId: form.equipmentId || undefined,
      problem: form.problem,
      service: form.service,
      value: form.value,
      date: form.date,
      time: form.time,
      address: form.address || (customer ? `${customer.street || ''} ${customer.number || ''}`.trim() : ''),
      technician: form.technician,
      status: 'agendado',
      checklist,
      fotosAntes: [],
      fotosDurante: [],
      fotosDepois: [],
      observacoesTecnicas: '',
      paymentStatus: 'pendente',
      createdAt: new Date().toISOString().slice(0, 10),
    });
    toast('success', 'Serviço agendado!');
    navigate('/app/agenda');
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Novo serviço" subtitle="Crie uma ordem de serviço" />
      <form onSubmit={handleSave} className="space-y-4 rounded-2xl bg-white p-5 shadow-card dark:bg-neutral-800">
        <Select label="Cliente *" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value, equipmentId: '' })}>
          <option value="">Selecione o cliente...</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Equipamento" value={form.equipmentId} onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}>
            <option value="">Nenhum equipamento</option>
            {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.brand} {eq.model} · {eq.btus} BTUs</option>)}
          </Select>
          <Select label="Tipo de serviço" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
            {SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
        </div>
        <Textarea label="Problema relatado / observações" rows={2} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} placeholder="O que o cliente relatou?" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="Horário" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Valor (R$)" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: +e.target.value })} />
          <Input label="Técnico" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} placeholder="Nome do técnico" />
        </div>
        <Input label="Endereço do atendimento" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Endereço onde será o serviço" />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Checklist</span>
            <span className="text-xs text-neutral-400">{checklist.filter((c) => c.done).length}/{checklist.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {checklist.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
                <input type="checkbox" checked={item.done} onChange={() => toggle(item.id)} className="h-4 w-4 rounded border-neutral-300 accent-primary-700 dark:border-neutral-600 dark:bg-neutral-800" />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" full>Salvar serviço</Button>
        </div>
      </form>
    </div>
  );
}
