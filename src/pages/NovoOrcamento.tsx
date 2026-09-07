import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { Send } from 'lucide-react';
import { db } from '../lib/db';
import { Button } from '../components/Button';
import { Input, Select, Textarea } from '../components/Fields';
import { BudgetItemsEditor } from '../components/BudgetItemsEditor';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { formatBRL, uid, budgetTotal, parseMoney, SERVICE_TYPES } from '../lib/utils';

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

  const [moneyText, setMoneyText] = useState({ labor: '', displacement: '', discount: '' });
  const [busy, setBusy] = useState(false);

  function setMoney(key: 'labor' | 'displacement' | 'discount', raw: string) {
    const clean = raw.replace(/[^\d,.]/g, '');
    setMoneyText((t) => ({ ...t, [key]: clean }));
    setForm((f) => ({ ...f, [key]: parseMoney(clean) }));
  }

  const total = useMemo(
    () => budgetTotal(items, form.labor, form.displacement, form.discount),
    [items, form.labor, form.displacement, form.discount]
  );

  async function handleSave(e: React.FormEvent, status: 'rascunho' | 'enviado') {
    e.preventDefault();
    if (busy) return;
    if (!form.customerId) {
      toast('error', 'Selecione um cliente.');
      return;
    }
    if (items.length === 0 || !items[0].description) {
      toast('error', 'Adicione ao menos um item.');
      return;
    }
    setBusy(true);
    try {
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <PageHeader title="Novo orçamento" subtitle="Monte os itens e o valor total" />
      <form onSubmit={(e) => handleSave(e, 'enviado')} className="space-y-4 rounded-2xl bg-white dark:bg-neutral-800 p-5 shadow-card">
        <Select label="Cliente *" required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
          <option value="">Selecione o cliente...</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Select label="Tipo de serviço" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
            {SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Input label="Prazo de validade" value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} placeholder="7 dias" />
        </div>
        <Textarea label="Descrição do serviço" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o serviço a ser realizado..." />

        <BudgetItemsEditor items={items} onChange={setItems} />

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3.5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Custos do serviço</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Input
              label="Mão de obra"
              inputMode="decimal"
              value={moneyText.labor}
              placeholder="0,00"
              onChange={(e) => setMoney('labor', e.target.value)}
            />
            <Input
              label="Deslocamento"
              hint="Taxa cobrada pelo deslocamento até o local"
              inputMode="decimal"
              value={moneyText.displacement}
              placeholder="0,00"
              onChange={(e) => setMoney('displacement', e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-700/40 p-3.5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Ajustes (opcional)</div>
          <Input
            label="Desconto"
            hint="Valor a ser descontado do total"
            inputMode="decimal"
            value={moneyText.discount}
            placeholder="0,00"
            onChange={(e) => setMoney('discount', e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-primary-50 dark:bg-primary-900/40 px-4 py-3">
          <span className="font-semibold text-primary-700 dark:text-primary-300">Valor total</span>
          <span className="text-xl font-extrabold text-primary-800 dark:text-primary-200">{formatBRL(total)}</span>
        </div>

        <Textarea label="Observações / condições" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button variant="secondary" type="button" disabled={busy} onClick={(e) => handleSave(e as any, 'rascunho')}>Salvar rascunho</Button>
          <Button type="submit" full disabled={busy}><Send size={16} /> Salvar e enviar</Button>
        </div>
      </form>
    </div>
  );
}
