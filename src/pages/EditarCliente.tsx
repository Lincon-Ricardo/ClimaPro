import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Fields';
import { useToast } from '../components/Toast';
import { formatPhone } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Loading } from '../components/Loading';

export default function EditarCliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const customer = useLiveQuery(() => db.customers.get(id!), [id]);
  const [busy, setBusy] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || '', phone: customer.phone || '', whatsapp: customer.whatsapp || '',
        email: customer.email || '', document: customer.document || '', street: customer.street || '',
        number: customer.number || '', complement: customer.complement || '', district: customer.district || '',
        city: customer.city || '', zip: customer.zip || '', notes: customer.notes || '',
      });
    }
  }, [customer]);

  if (!form) return <Loading />;

  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setZipLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast('error', 'CEP não encontrado.');
        return;
      }
      setForm((f: any) => ({
        ...f,
        street: data.logradouro || f.street,
        district: data.bairro || f.district,
        city: data.localidade || f.city,
        zip: digits,
      }));
    } catch {
      toast('error', 'Não foi possível buscar o CEP.');
    } finally {
      setZipLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!form.name?.trim()) {
      toast('error', 'Informe o nome do cliente.');
      return;
    }
    setBusy(true);
    try {
      await db.customers.update(id!, {
        name: form.name,
        phone: form.phone || '',
        whatsapp: form.whatsapp || form.phone || '',
        email: form.email || '',
        document: form.document || '',
        street: form.street || '',
        number: form.number || '',
        complement: form.complement || '',
        district: form.district || '',
        city: form.city || '',
        zip: form.zip || '',
        notes: form.notes || '',
      });
      toast('success', 'Cliente atualizado!');
      navigate(`/app/clientes/${id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Editar cliente" subtitle="Atualize os dados do cliente" />
      <form onSubmit={handleSave} className="space-y-4 rounded-2xl bg-white p-5 shadow-card dark:bg-neutral-800">
        <Input label="Nome completo *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: João da Silva" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(11) 99999-0000" />
          <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: formatPhone(e.target.value) })} placeholder="(11) 99999-0000" />
        </div>
        <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="CPF/CNPJ" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input label="CEP" hint={zipLoading ? 'Buscando endereço...' : undefined} value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} onBlur={() => lookupCep(form.zip)} />
          <Input label="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input label="Bairro" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_6rem_1fr]">
          <Input label="Rua" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          <Input label="Nº" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          <Input label="Complemento" value={form.complement} onChange={(e) => setForm({ ...form, complement: e.target.value })} />
        </div>
        <Textarea label="Observações" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(`/app/clientes/${id}`)}>Cancelar</Button>
          <Button type="submit" full disabled={busy}>{busy ? 'Salvando...' : 'Salvar alterações'}</Button>
        </div>
      </form>
    </div>
  );
}
