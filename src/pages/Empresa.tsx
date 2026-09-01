import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Fields';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { Loading } from '../components/Loading';

export default function Empresa() {
  const navigate = useNavigate();
  const toast = useToast();
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const company = companies[0];

  const [form, setForm] = useState({
    name: '', cnpj: '', phone: '', whatsapp: '', email: '',
    address: '', instagram: '', site: '', pix: '',
  });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '',
        cnpj: company.cnpj || '',
        phone: company.phone || '',
        whatsapp: company.whatsapp || '',
        email: company.email || '',
        address: company.address || '',
        instagram: company.instagram || '',
        site: company.site || '',
        pix: company.pix || '',
      });
    }
  }, [company]);

  if (!company) return <Loading />;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await db.companies.update(company.id, { ...form });
    toast('success', 'Perfil atualizado!');
    navigate('/app/perfil');
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Editar perfil da empresa" subtitle="Essas informações aparecem nos orçamentos e documentos" />
      <form onSubmit={handleSave} className="space-y-4 rounded-2xl bg-white p-5 shadow-card dark:bg-neutral-800">
        <Input label="Nome da empresa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="CNPJ/CPF" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <Textarea label="Endereço" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
          <Input label="Site" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
        </div>
        <Input label="Chave PIX" value={form.pix} onChange={(e) => setForm({ ...form, pix: e.target.value })} />
        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" full>Salvar</Button>
        </div>
      </form>
    </div>
  );
}
