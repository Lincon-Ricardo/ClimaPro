import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Fields';
import { useToast } from '../components/Toast';
import { formatPhone } from '../lib/utils';
import { customerSchema, parseFormData } from '../lib/schemas';
import { PageHeader } from '../components/PageHeader';

export default function NovoCliente() {
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', whatsapp: '', email: '', document: '',
    street: '', number: '', complement: '', district: '', city: '', zip: '', notes: '',
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const result = parseFormData(customerSchema, form);
    if (!result.valid) {
      const first = Object.values(result.errors || {})[0];
      toast('error', first || 'Preencha os campos obrigatórios.');
      return;
    }
    setBusy(true);
    try {
      await db.customers.add({
        id: crypto.randomUUID(),
        ...form,
        whatsapp: form.whatsapp || form.phone,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      toast('success', 'Cliente cadastrado!');
      navigate('/app/clientes');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Novo cliente" subtitle="Preencha os dados básicos" />
      <form onSubmit={handleSave} className="space-y-4 rounded-2xl bg-white p-5 shadow-card dark:bg-neutral-800">
        <Input label="Nome completo *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: João da Silva" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Telefone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-0000" />
          <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: formatPhone(e.target.value) })} placeholder="(11) 99999-0000" />
        </div>
        <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="CPF/CNPJ" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
        <div className="grid grid-cols-3 gap-3">
          <Input label="CEP" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
          <Input label="Cidade *" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="Bairro *" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
        </div>
        <div className="grid grid-cols-[1fr_4rem_1fr] gap-3">
          <Input label="Rua *" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          <Input label="Nº *" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          <Input label="Complemento" value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
        </div>
        <Textarea label="Observações" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" full disabled={busy}>Salvar cliente</Button>
        </div>
      </form>
    </div>
  );
}
