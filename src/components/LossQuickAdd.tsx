import { useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { db } from '../lib/db';
import { Button } from './Button';
import { Modal } from './Modal';
import { Input, Select } from './Fields';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import { todayISO, formatBRL } from '../lib/utils';
import { errMsg } from '../lib/errors';
import { LOSS_KINDS } from '../lib/losses';
import { Card } from './Card';
import { useLiveQuery } from '../hooks/useLiveQuery';
import type { Loss, LossKind } from '../types';

export function LossQuickAdd({ orderId, customerId, companyId }: { orderId: string; customerId: string; companyId?: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<LossKind>('retrabalho');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const companies = useLiveQuery(() => db.companies.toArray(), [], 'companies') || [];
  const resolvedCompanyId = companyId || user?.companyId || companies[0]?.id || '';
  const losses = (useLiveQuery(
    () => db.losses.list({ pageSize: 100, eq: { serviceOrderId: orderId } }).then((r) => r.rows),
    [orderId],
    'losses',
  ) || []) as Loss[];
  const total = losses.filter((l) => l.status !== 'cancelada').reduce((s, l) => s + (Number(l.value) || 0), 0);

  async function save() {
    if (busy) return;
    if (!description.trim()) { toast('error', 'Descreva a perda.'); return; }
    const val = Number(String(value).replace(/\./g, '').replace(',', '.'));
    if (!val || val <= 0) { toast('error', 'Informe um valor maior que zero.'); return; }
    if (!resolvedCompanyId) {
      toast('error', 'Empresa não identificada. Recarregue a OS.');
      return;
    }
    setBusy(true);
    try {
      await db.losses.add({
        id: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        kind,
        description: description.trim(),
        value: Math.round(val * 100) / 100,
        date: todayISO(),
        serviceOrderId: orderId,
        customerId,
        technician: user?.name || '',
        status: 'aberta',
        createdBy: user?.id || user?.email || '',
      } as Loss);
      setDescription('');
      setValue('');
      setOpen(false);
      toast('success', 'Perda lançada! O dono decide o destino em /app/perdas.');
    } catch (e: unknown) {
      toast('error', errMsg(e, 'Não foi possível lançar.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="mt-3 border-red-100 dark:border-red-900/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-neutral-800 dark:text-neutral-100">
            <TrendingDown size={18} className="text-red-500" /> Perdas desta OS
            {total > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-black text-red-700 dark:bg-red-950/50 dark:text-red-300">
                - {formatBRL(total)}
              </span>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Lançar perda
          </Button>
        </div>
        {losses.length === 0 ? (
          <p className="mt-2 text-xs text-neutral-400">Nenhuma perda lançada. Se algo evaporar aqui (retrabalho, peça, desconto), lance para o dono ver.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {losses.slice(0, 4).map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-xs dark:bg-neutral-900/60">
                <span className="min-w-0 truncate font-semibold text-neutral-600 dark:text-neutral-300">
                  {LOSS_KINDS.find((k) => k.key === l.kind)?.emoji} {l.description} · {l.status}
                </span>
                <span className="shrink-0 font-black text-red-600 dark:text-red-300">- {formatBRL(Number(l.value) || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Lançar perda nesta OS">
        <div className="space-y-3">
          <Select label="Tipo de perda" value={kind} onChange={(e) => setKind(e.target.value as LossKind)}>
            {LOSS_KINDS.map((k) => <option key={k.key} value={k.key}>{k.emoji} {k.label} — {k.hint}</option>)}
          </Select>
          <Input label="O que aconteceu?" placeholder="Ex: compressor queimou na partida — trocar" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input label="Valor perdido (R$)" inputMode="decimal" placeholder="0,00" value={value} onChange={(e) => setValue(e.target.value)} />
          <p className="text-[11px] text-neutral-400">Visível só para o dono decidir: absorver, descontar ou cobrar via Asaas.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>{busy ? 'Lançando…' : 'Lançar perda'}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
