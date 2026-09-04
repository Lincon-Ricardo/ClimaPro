import { useState } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { UserRound, Plus, Trash2, ShieldCheck, Wrench, Pencil } from 'lucide-react';
import { db } from '../lib/db';
import { createIsolatedClient } from '../lib/supabaseClient';
import { emitDataChanged } from '../lib/tableBus';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

const emptyForm = { name: '', email: '', password: '', role: 'tech' as 'tech' | 'admin' };

export default function Users() {
  const toast = useToast();
  const { user } = useAuth();
  const users = useLiveQuery(() => db.users.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin';

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(u: any) {
    setEditing(u);
    setForm({ name: u.name || '', email: u.email || '', password: '', role: u.role === 'admin' ? 'admin' : 'tech' });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      toast('error', 'Somente o dono pode gerenciar usuários.');
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      toast('error', 'Preencha nome e e-mail.');
      return;
    }
    if (!editing && !form.password) {
      toast('error', 'Defina uma senha para o novo usuário.');
      return;
    }
    if (!editing && form.password && form.password.length < 6) {
      toast('error', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    const email = form.email.trim().toLowerCase();
    setSaving(true);
    try {
      if (editing) {
        await db.users.update(editing.id, {
          name: form.name.trim(),
          firstName: form.name.trim().split(' ')[0],
          role: form.role,
        });
        toast('success', form.password
          ? 'Usuário atualizado! Para trocar a senha, use "Esqueci minha senha" no login.'
          : 'Usuário atualizado!');
      } else {
        const existing = await db.users.where('email').equals(email).first();
        if (existing) {
          toast('error', 'Este e-mail já está cadastrado.');
          return;
        }
        const companyId = user?.companyId || companies[0]?.id || companies[0]?.companyId;
        if (!companyId) {
          toast('error', 'Empresa não encontrada. Tente recarregar a página.');
          return;
        }
        const isolated = createIsolatedClient();
        let data: any;
        let error: any;
        try {
          const res = await isolated.auth.signUp({
            email,
            password: form.password,
            options: { data: { name: form.name.trim(), company_id: companyId, role: form.role } },
          });
          data = res.data;
          error = res.error;
        } catch (e: any) {
          console.error('[Users] signUp falhou:', e);
          toast('error', 'Falha de conexão ao cadastrar: ' + (e?.message || String(e)));
          return;
        }
        if (error) {
          console.error('[Users] signUp erro:', error);
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already been registered')) {
            toast('error', 'Este e-mail já tem login criado. Use outro e-mail ou apague o usuário em Supabase > Authentication > Users.');
          } else {
            toast('error', error.message || 'Não foi possível cadastrar.');
          }
          return;
        }
        const newId = data?.user?.id as string | undefined;
        if (!newId) {
          console.error('[Users] signUp sem user:', data);
          toast('error', 'Supabase não retornou o usuário. Veja o console (F12) e tente de novo.');
          return;
        }
        let profileOk = false;
        for (let i = 0; i < 6; i++) {
          try {
            const p = await db.users.get(newId);
            if (p) { profileOk = true; break; }
          } catch { /* trigger pode demorar */ }
          await new Promise((r) => setTimeout(r, 600));
        }
        if (!profileOk) {
          try {
            await db.users.add({
              id: newId,
              name: form.name.trim(),
              first_name: form.name.trim().split(' ')[0],
              email,
              role: form.role,
              company_id: companyId,
            });
            profileOk = true;
          } catch (e: any) {
            console.error('[Users] insert profile falhou:', e);
            toast('error', 'Conta criada no login, mas perfil bloqueado (RLS): ' + (e?.message || String(e)) + '. Rode o schema.sql novo no Supabase e tente outro e-mail.');
            return;
          }
        }
        emitDataChanged('profiles');
        emitDataChanged('users');
        if (!data.session) {
          toast('success', 'Técnico cadastrado! Ele confirma o e-mail e já aparece na lista.');
        } else {
          toast('success', 'Técnico cadastrado!');
        }
      }
    } catch (err: any) {
      toast('error', `Erro ao salvar: ${err?.message || 'tente novamente'}`);
      return;
    } finally {
      setSaving(false);
    }

    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleDelete(id: string) {
    if (!isAdmin) {
      toast('error', 'Somente o dono pode remover usuários.');
      return;
    }
    if (id === user?.id) {
      toast('error', 'Você não pode remover a própria conta.');
      return;
    }
    if (!confirm('Remover este usuário? Ele perderá o acesso à empresa.')) return;
    try {
      await db.users.delete(id);
      toast('info', 'Usuário removido.');
    } catch (err: any) {
      toast('error', `Erro ao remover: ${err?.message || 'tente novamente'}`);
    }
  }

  if (user && !isAdmin) {
    return (
      <div className="max-w-2xl">
        <PageHeader title="Técnicos" subtitle="Acesso restrito" />
        <Card><p className="text-sm text-neutral-500 dark:text-neutral-400">Somente o dono da empresa pode gerenciar a equipe.</p></Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Técnicos"
        subtitle={`${users.length} usuário(s) na equipe`}
        action={<Button onClick={openCreate}><Plus size={18} /> Novo técnico</Button>}
      />

      {users.length === 0 ? (
        <EmptyState
          icon={<UserRound size={26} />}
          title="Nenhum técnico cadastrado"
          subtitle="Cadastre sua equipe para acompanhar o desempenho."
          action={<Button onClick={openCreate}><Plus size={18} /> Novo técnico</Button>}
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
                  type="button"
                  onClick={() => openEdit(u)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-900/40 dark:hover:text-primary-300"
                  title="Editar"
                  aria-label={`Editar ${u.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(u.id)}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/40 dark:hover:text-red-300"
                  title="Remover"
                  aria-label={`Remover ${u.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-400">
        Técnicos entram no ClimaPro com o e-mail e senha cadastrados aqui. Para trocar a senha de um técnico, peça para ele usar "Esqueci minha senha" na tela de login.
      </p>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar técnico' : 'Cadastrar novo técnico'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Rafael Técnico" />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rafael@empresa.com" disabled={!!editing} />
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Função</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'tech' | 'admin' })}
              className="w-full rounded-xl border border-neutral-300 bg-transparent px-3 py-2.5 text-sm text-neutral-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:text-neutral-100 dark:focus:ring-primary-900/30"
            >
              <option value="tech">Técnico</option>
              <option value="admin">Dono</option>
            </select>
          </div>
          <Input
            label={editing ? 'Nova senha (use o login para trocar)' : 'Senha'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editing ? 'A troca é feita pelo "Esqueci minha senha"' : 'Crie uma senha'}
            disabled={!!editing}
          />
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" full disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
