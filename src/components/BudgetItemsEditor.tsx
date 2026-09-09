import { useEffect, useMemo, useState } from 'react';
import { Button } from './Button';
import { Input } from './Fields';
import { MaterialCatalog } from './MaterialCatalog';
import { formatBRL, numberToBRLInput, parseMoney, uid } from '../lib/utils';
import type { BudgetItem, Material } from '../types';
import { ArrowDown, ArrowUp, Copy, Minus, Package, Plus, Trash2 } from 'lucide-react';

export function BudgetItemsEditor({
  items,
  onChange,
}: {
  items: BudgetItem[];
  onChange: (items: BudgetItem[]) => void;
}) {
  const [valueTexts, setValueTexts] = useState<Record<string, string>>({});
  const [catalogOpen, setCatalogOpen] = useState(false);

  useEffect(() => {
    setValueTexts((prev) => {
      const next = { ...prev };
      for (const it of items) {
        if (!(it.id in next)) next[it.id] = it.unitValue ? numberToBRLInput(it.unitValue) : '';
      }
      return next;
    });
  }, [items]);

  const total = useMemo(
    () => items.reduce((s, i) => s + (i.qty || 0) * (i.unitValue || 0), 0),
    [items]
  );

  function updateItem(id: string, patch: Partial<BudgetItem>) {
    onChange(
      items.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...patch };
        next.total = (next.qty || 0) * (next.unitValue || 0);
        return next;
      })
    );
  }

  function addItem(extra: Partial<BudgetItem> = {}) {
    const qty = extra.qty ?? 1;
    const unitValue = extra.unitValue ?? 0;
    const it: BudgetItem = {
      id: uid('it'),
      description: extra.description ?? '',
      qty,
      unitValue,
      total: qty * unitValue,
    };
    onChange([...items, it]);
    setValueTexts((prev) => ({ ...prev, [it.id]: it.unitValue ? numberToBRLInput(it.unitValue) : '' }));
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function duplicateItem(id: string) {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const copy = { ...items[idx], id: uid('it') };
    const next = [...items];
    next.splice(idx + 1, 0, copy);
    onChange(next);
    setValueTexts((prev) => ({ ...prev, [copy.id]: copy.unitValue ? numberToBRLInput(copy.unitValue) : '' }));
  }

  function moveItem(id: string, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.id === id);
    const to = idx + dir;
    if (idx === -1 || to < 0 || to >= items.length) return;
    const next = [...items];
    const [it] = next.splice(idx, 1);
    next.splice(to, 0, it);
    onChange(next);
  }

  function setValueText(id: string, text: string) {
    setValueTexts((prev) => ({ ...prev, [id]: text }));
    updateItem(id, { unitValue: parseMoney(text) });
  }

  function handleInsert(m: Pick<Material, 'name' | 'unitValue'>) {
    addItem({ description: m.name, unitValue: m.unitValue });
    setCatalogOpen(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Itens / materiais</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={() => setCatalogOpen(true)}>
            <Package size={16} /> Catálogo
          </Button>
          <Button variant="secondary" size="sm" type="button" onClick={() => addItem()}>
            <Plus size={16} /> Adicionar
          </Button>
        </div>
      </div>

      <div className="mt-2 space-y-3">
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-sm text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
            Nenhum item adicionado ainda.
          </div>
        )}

        {items.map((it, idx) => (
          <div key={it.id} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-card dark:border-neutral-700 dark:bg-neutral-800">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  placeholder="Descrição do item / material"
                  value={it.description}
                  onChange={(e) => updateItem(it.id, { description: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeItem(it.id)}
                className="mt-1 shrink-0 rounded-lg p-2 text-neutral-400 transition hover:bg-danger/10 hover:text-danger"
                aria-label="Remover item"
              >
                <Trash2 size={17} />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-1 items-end gap-2 sm:grid-cols-2 lg:grid-cols-[auto_150px_190px_auto]">
              <div className="flex items-center overflow-hidden rounded-xl border border-neutral-300 dark:border-neutral-600">
                <button
                  type="button"
                  onClick={() => updateItem(it.id, { qty: Math.max(0, (it.qty || 0) - 1) })}
                  className="px-2.5 py-2.5 text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700/60"
                  aria-label="Diminuir quantidade"
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-14 border-x border-neutral-300 px-1 py-2 text-center text-sm focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  value={it.qty}
                  min={0}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    updateItem(it.id, { qty: Number.isFinite(v) && v >= 0 ? v : 0 });
                  }}
                />
                <button
                  type="button"
                  onClick={() => updateItem(it.id, { qty: (it.qty || 0) + 1 })}
                  className="px-2.5 py-2.5 text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-700/60"
                  aria-label="Aumentar quantidade"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                  R$
                </span>
                <input
                  inputMode="decimal"
                  value={valueTexts[it.id] ?? ''}
                  onChange={(e) => setValueText(it.id, e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-neutral-300 py-2.5 pl-8 pr-3 text-right text-sm font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="pb-2.5 text-right">
                <div className="text-sm font-bold text-primary-700 dark:text-primary-300">{formatBRL(it.total)}</div>
                <div className="text-[10px] text-neutral-400">total</div>
              </div>

              <div className="flex justify-end gap-1 border-t border-neutral-100 pt-2 sm:col-span-1 sm:border-t-0 sm:pt-0 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => duplicateItem(it.id)}
                  className="rounded-lg p-2 text-neutral-400 transition hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-500 dark:hover:bg-primary-900/40 dark:hover:text-primary-300"
                  aria-label="Duplicar item"
                  title="Duplicar"
                >
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(it.id, -1)}
                  disabled={idx === 0}
                  className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-500 dark:hover:bg-neutral-700/60"
                  aria-label="Mover para cima"
                  title="Mover para cima"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(it.id, 1)}
                  disabled={idx === items.length - 1}
                  className="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-500 dark:hover:bg-neutral-700/60"
                  aria-label="Mover para baixo"
                  title="Mover para baixo"
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-primary-50 px-4 py-3 dark:bg-primary-900/40">
        <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">Subtotal (itens)</span>
        <span className="text-lg font-extrabold text-primary-800 dark:text-primary-200">{formatBRL(total)}</span>
      </div>

      <MaterialCatalog
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onInsert={handleInsert}
      />
    </div>
  );
}