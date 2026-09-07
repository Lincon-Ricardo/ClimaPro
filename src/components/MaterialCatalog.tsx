import { useState } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Fields';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';
import { formatBRL, parseMoney, numberToBRLInput, uid } from '../lib/utils';
import type { Material } from '../types';
import { Package, Plus, Search, Trash2, Pencil, Check, ClipboardList } from 'lucide-react';

export function MaterialCatalog({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (m: Pick<Material, 'name' | 'unitValue'>) => void;
}) {
  const toast = useToast();
  const materials = useLiveQuery(() => db.materials.toArray(), []) || [];
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [valueText, setValueText] = useState('');

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function startEdit(m: Material) {
    setEditingId(m.id);
    setName(m.name);
    setValueText(numberToBRLInput(m.unitValue));
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setValueText('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast('error', 'Informe o nome do material.');
      return;
    }
    const unitValue = parseMoney(valueText);
    if (editingId) {
      await db.materials.update(editingId, { name: trimmed, unitValue });
      toast('success', 'Material atualizado!');
    } else {
      await db.materials.add({ id: uid('mat'), name: trimmed, unitValue });
      toast('success', 'Material adicionado ao catálogo!');
    }
    resetForm();
  }

  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  async function handleDelete(m: Material) {
    setDeleteTarget(m);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    await db.materials.delete(deleteTarget.id);
    toast('success', 'Material removido.');
    setDeleteTarget(null);
  }

  return (
    <>
    <Modal open={open} onClose={onClose} title="Catálogo de materiais" wide>
      <div className="space-y-4">
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 lg:grid-cols-[1fr_140px_auto] dark:border-neutral-700 dark:bg-neutral-900/60">
          <Input
            placeholder="Nome do material (ex.: Filtro TCL)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Valor unit."
            value={valueText}
            inputMode="decimal"
            onChange={(e) => setValueText(e.target.value)}
          />
          <Button type="submit" variant={editingId ? 'secondary' : 'primary'} className="sm:self-end">
            {editingId ? <><Check size={16} /> Salvar</> : <><Plus size={16} /> Adicionar</>}
          </Button>
        </form>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            placeholder="Buscar material..."
            aria-label="Buscar material"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 pl-9 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
          />
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
              Nenhum material no catálogo. Adicione os materiais que você usa com frequência.
            </div>
          )}
          {filtered.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700 dark:bg-neutral-700/40">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                <Package size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">{m.name}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{formatBRL(m.unitValue)}</div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onInsert({ name: m.name, unitValue: m.unitValue })}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-800 dark:hover:bg-primary-600"
                >
                  <ClipboardList size={13} /> Inserir
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(m)}
                  className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-primary-700 dark:hover:bg-neutral-700/60 dark:hover:text-primary-300"
                  aria-label="Editar material"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m)}
                  className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-danger/10 hover:text-danger dark:hover:bg-red-900/40 dark:hover:text-red-300"
                  aria-label="Remover material"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Remover "${deleteTarget?.name || 'material'}"?`}
        message="Essa ação não pode ser desfeita."
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}