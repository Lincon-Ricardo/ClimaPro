import { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Check } from 'lucide-react';
import { Input } from './Fields';
import { getSavedAddresses } from '../lib/addresses';
import type { Customer } from '../types';

export function AddressPicker({
  customer,
  value,
  onChange,
}: {
  customer: Customer | null | undefined;
  value: string;
  onChange: (address: string, isNew: boolean, label: string) => void;
}) {
  const options = useMemo(() => getSavedAddresses(customer), [customer]);
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    setMode('pick');
    setNewLabel('');
    setNewAddress('');
  }, [customer?.id]);

  useEffect(() => {
    if (!customer) return;
    if (!value && options.length > 0) {
      onChange(options[0].address, false, options[0].label);
    }
  }, [customer, options, value, onChange]);

  if (!customer) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-3 text-xs text-neutral-400 dark:border-neutral-700">
        Selecione um cliente para carregar o endereço automaticamente.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <MapPin size={15} className="text-danger" /> Endereço do atendimento
        </label>
        <button
          type="button"
          onClick={() => setMode(mode === 'pick' ? 'new' : 'pick')}
          className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
        >
          {mode === 'pick' ? (
            <><Plus size={13} /> Outro endereço</>
          ) : (
            <><Check size={13} /> Escolher salvo</>
          )}
        </button>
      </div>

      {mode === 'pick' ? (
        <div className="space-y-1.5">
          {options.length === 0 && (
            <p className="text-xs text-neutral-400">Cliente sem endereço cadastrado. Adicione um novo abaixo.</p>
          )}
          {options.map((o) => {
            const active = value === o.address;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange(o.address, false, o.label)}
                className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30 dark:border-sky-400 dark:bg-neutral-800 dark:ring-sky-400/30'
                    : 'border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50/50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-sky-400/60'
                }`}
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-primary-600 bg-primary-600 text-white' : 'border-neutral-300 text-transparent dark:border-neutral-600'}`}>
                  <Check size={12} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-sky-300">{o.label}</span>
                  <span className="block break-words text-sm text-neutral-700 dark:text-neutral-100">{o.address}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-dashed border-primary-300 bg-primary-50/50 p-3 dark:border-primary-700 dark:bg-neutral-900">
          <Input
            label="Apelido do local"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ex.: Casa, Comércio, Sítio, Mãe..."
          />
          <Input
            label="Endereço completo"
            value={newAddress}
            onChange={(e) => {
              setNewAddress(e.target.value);
              onChange(e.target.value, true, newLabel);
            }}
            placeholder="Rua, número, bairro, cidade"
          />
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Ao salvar, este endereço ficará vinculado ao cliente para uso futuro.
          </p>
        </div>
      )}
    </div>
  );
}
