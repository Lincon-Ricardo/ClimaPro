import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { Plus, Trash2, Send } from 'lucide-react';
import { db } from '../lib/db';
import { Button } from '../components/Button';
import { Input, Select, Textarea } from '../components/Fields';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { formatBRL, uid, SERVICE_TYPES } from '../lib/utils';

export default function NovoOrcamento() {
  const navigate = useNavigate();
  const toast = useToast();
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];

  const [form, setForm] = useState({
    customerId: '',
    serviceType: 'Instalação',
    description: '',
    labor: 0,
    displacement: 0,
    discount: 0,
    validity: '7 dias',
    notes: '',
  });
  const [items, setItems] = useState([
    { id: uid('it'), description: '', qty: 1, unitValue: 0, total: 0 },
  ]);

  const total = useMemo(() => {
    const itemsTotal = items.reduce((s, i) => s + (i.qty || 0) * (i.unitValue || 0), 0);
    return itemsTotal + (form.labor || 0) + (form.displacement || 0) - (form.discount || 0);
  }, [items, form.labor, form.displacement, form.discount]);

  function updateItem(id: string, patch: Partial<typeof items[number]>) {
    setItems((list) =>
      list.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...patch };
        next.total = (next.qty || 0) * (next.unitValue || 0);
        return next;
      })
    );
  }

  function addItem() {
    setItems((list) => [...list, { id: uid('it'), description: '', qty: 1, unitValue: 0, total: 0 }]);
  }

  function removeItem(id: string) {
    setItems((list) => list.filter((i) => i.id !== id));
  }

  async function handleSave(e: React.FormEvent, status: 'rascunho' | 'enviado') {
    e.preventDefault();
    if (!form.customerId) {
      toast('error', 'Selecione um cliente.');
      return;
    }
    if (items.length === 0 || !items[0].description) {
      toast('error', 'Adicione ao menos um item.');
      return;
    }
    const id = crypto.randomUUID();
    const number = String(Date.now()).slice(-6);
    await db.budgets.add({
      id,
      number,
      customerId: form.customerId,
      serviceType: form.serviceType,
      description: form.description,
      items: items.filter((i) => i.description),
      labor: form.labor,
      displacement: form.displacement,
      discount: form.discount,
      total,
      status,
      validity: form.validity,
      notes: form.notes,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    toast(status === 'enviado' ? 'success' : 'info', status === 'enviado' ? 'Orçamento enviado!' : 'Orçamento salvo como rascunho.');
    navigate(`/app/orcamentos/${id}`);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novo orçamento" subtitle="Monte os itens e o valor total" />
      <form onSubmit={(e) => handleSave(e, 'enviado')} className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
        <Select label="Cliente *" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
          <option value="">Selecione o cliente...</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Tipo de serviço" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
            {SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Prazo de validade" value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} placeholder="7 dias" />
        </div>
        <Textarea label="Descrição do serviço" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o serviço a ser realizado..." />

        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-700">Itens / materiais</span>
            <Button variant="secondary" size="sm" type="button" onClick={addItem}><Plus size={16} /> Adicionar</Button>
          </div>
          <div className="mt-2 space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-end gap-2 rounded-xl border border-neutral-200 p-2">
                <Input placeholder="Descrição" value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} />
                <Input type="number" placeholder="Qtd" className="w-20" value={it.qty} onChange={(e) => updateItem(it.id, { qty: +e.target.value })} />
                <Input type="number" placeholder="Valor" className="w-28" value={it.unitValue} onChange={(e) => updateItem(it.id, { unitValue: +e.target.value })} />
                <div className="w-24 pb-2.5 text-sm font-semibold text-neutral-600">{formatBRL(it.total)}</div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(it.id)} className="pb-2.5 text-neutral-400 hover:text-danger">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input label="Mão de obra" type="number" value={form.labor} onChange={(e) => setForm({ ...form, labor: +e.target.value })} />
          <Input label="Deslocamento" type="number" value={form.displacement} onChange={(e) => setForm({ ...form, displacement: +e.target.value })} />
          <Input label="Desconto" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: +e.target.value })} />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3">
          <span className="font-semibold text-primary-700">Valor total</span>
          <span className="text-xl font-extrabold text-primary-800">{formatBRL(total)}</span>
        </div>

        <Textarea label="Observações / condições" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button variant="secondary" type="button" onClick={(e) => handleSave(e as any, 'rascunho')}>Salvar rascunho</Button>
          <Button type="submit" full><Send size={16} /> Salvar e enviar</Button>
        </div>
      </form>
    </div>
  );
}
