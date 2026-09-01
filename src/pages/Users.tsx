import { useState } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { UserRound, Plus, Trash2, ShieldCheck, Wrench } from 'lucide-react';
import { db } from '../lib/db';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import Modal from './_Modal';

export default function Users() {
  const toast = useToast();
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast('error', 'Preencha nome, e-mail e senha.');
      return;
    }
    const existing = await db.users.where('email').equals(form.email.trim().toLowerCase()).first();
    if (existing) {
      toast('error', 'Este e-mail já está cadastrado.');
      return;
    }
    setSaving(true);
    await db.users.add({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      firstName: form.name.trim().split(' ')[0],
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: 'tech',
    });
    setSaving(false);
    setShowModal(false);
    setForm({ name: '', email: '', password: '' });
    toast('success', 'Técnico cadastrado!');
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este usuário?')) return;
    await db.users.delete(id);
    toast('info', 'Usuário removido.');
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Técnicos"
        subtitle={`${users.length} usuário(s) na equipe`}
        action={<Button onClick={() => setShowModal(true)}><Plus size={18} /> Novo técnico</Button>}
      />

      {users.length === 0 ? (
        <EmptyState
          icon={<UserRound size={26} />}
          title="Nenhum técnico cadastrado"
          subtitle="Cadastre sua equipe para acompanhar o desempenho."
          action={<Button onClick={() => setShowModal(true)}><Plus size={18} /> Novo técnico</Button>}
        />
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  {u.role === 'admin' ? <ShieldCheck size={20} /> : <Wrench size={20} />}
                </div>
                <div>
                  <div className="font-bold text-neutral-800 dark:text-neutral-100">{u.name}</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{u.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.role === 'admin' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700/60 dark:text-neutral-300'}`}>
                  {u.role === 'admin' ? 'Dono' : 'Técnico'}
                </span>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-danger"
                  title="Remover"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-400">
        Técnicos podem entrar no ClimaPro com o e-mail e senha cadastrados aqui.
      </p>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Cadastrar novo técnico">
        <form onSubmit={handleCreate} className="space-y-3">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Rafael Técnico" />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rafael@empresa.com" />
          <Input label="Senha" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Crie uma senha" />
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" full disabled={saving}>{saving ? 'Salvando...' : 'Cadastrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
