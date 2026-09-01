import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { Snowflake, Check, X, MapPin, CalendarCheck, MessageCircle } from 'lucide-react';
import { db } from '../lib/db';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { formatBRL, formatDate, telToWhats } from '../lib/utils';
import type { BudgetItem } from '../types';

const BUDGET_STATUS: Record<string, { label: string; dot: string }> = {
  rascunho: { label: 'Rascunho', dot: 'bg-neutral-400' },
  enviado: { label: 'Enviado', dot: 'bg-blue-500' },
  aprovado: { label: 'Aprovado', dot: 'bg-green-500' },
  recusado: { label: 'Recusado', dot: 'bg-red-500' },
};

type Decision = 'aprovado' | 'recusado' | undefined;

export default function ClienteOrcamento() {
  const { id } = useParams();
  const [decision, setDecision] = useState<Decision>();
  const budget = useLiveQuery(() => db.budgets.get(id!), [id]);
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const companies = useLiveQuery(() => db.companies.toArray(), []) || [];

  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
        <Card className="w-full max-w-sm text-center">
          <div className="text-neutral-400">
            <Snowflake size={28} className="mx-auto" />
          </div>
          <h1 className="mt-3 text-lg font-bold text-neutral-800 dark:text-neutral-100">Orçamento não encontrado</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">O link que você acessou é inválido ou expirou.</p>
        </Card>
      </div>
    );
  }

  const b = budget;
  const company = companies[0];
  const customer = customers.find((c) => c.id === b.customerId);

  async function handleDecision(d: 'aprovado' | 'recusado') {
    setDecision(d);
    await db.budgets.update(b.id, {
      status: d,
      approvedAt: d === 'aprovado' ? new Date().toISOString().slice(0, 10) : undefined,
    });
  }

  if (decision) {
    const aprovado = decision === 'aprovado';
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
        <Card className="w-full max-w-md text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white ${
              aprovado ? 'bg-success' : 'bg-danger'
            }`}
          >
            {aprovado ? <Check size={32} /> : <X size={32} />}
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-neutral-800 dark:text-neutral-100">
            {aprovado ? 'Orçamento aprovado!' : 'Orçamento recusado'}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {aprovado
              ? `Obrigado, ${customer?.name || ''}! O ${company?.name || 'prestador'} recebeu sua aprovação e entrará em contato para agendar o serviço.`
              : 'Obrigado pelo retorno! Se precisar de ajustes no orçamento, é só falar com o prestador.'}
          </p>
          {aprovado && customer && company && (
            <Button
              as="a"
              href={`https://wa.me/${telToWhats(company.whatsapp)}`}
              target="_blank"
              rel="noreferrer"
              full
              variant="success"
              className="mt-4"
            >
              <MessageCircle size={16} /> Falar com o prestador
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const badge = BUDGET_STATUS[b.status] || { label: b.status, dot: 'bg-neutral-400' };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <header className="bg-gradient-to-r from-primary-800 to-primary-600 px-5 py-6 text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Snowflake size={22} />
            </div>
            <div className="text-lg font-extrabold">{company?.name || 'ClimaPro'}</div>
          </div>
          <span className="text-xs font-medium text-primary-100">Orçamento #{b.number}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <Card className="mb-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Cliente</div>
              <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{customer?.name || 'Cliente'}</div>
              {customer && (
                <div className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <MapPin size={14} /> {customer.street || ''} {customer.number || ''} {customer.city ? `- ${customer.city}` : ''}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Total</div>
              <div className="text-2xl font-extrabold text-primary-800 dark:text-primary-200">{formatBRL(b.total)}</div>
              <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-700/60 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-200`}>
                <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
            </div>
          </div>
        </Card>

        <Card className="mb-4">
          <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">{b.serviceType}</h2>
          {b.description && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{b.description}</p>}
          <div className="mt-3 space-y-1.5 border-t border-neutral-100 dark:border-neutral-700 pt-3">
            {b.items.map((i: BudgetItem) => (
              <div key={i.id} className="flex justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-300">{i.qty}x {i.description}</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-100">{formatBRL(i.total)}</span>
              </div>
            ))}
            {b.labor > 0 && (
              <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400">
                <span>Mão de obra</span><span>{formatBRL(b.labor)}</span>
              </div>
            )}
            {b.displacement > 0 && (
              <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400">
                <span>Deslocamento</span><span>{formatBRL(b.displacement)}</span>
              </div>
            )}
            {b.discount > 0 && (
              <div className="flex justify-between text-sm text-danger">
                <span>Desconto</span><span>- {formatBRL(b.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-100 dark:border-neutral-700 pt-2 text-base font-bold text-neutral-800 dark:text-neutral-100">
              <span>Total</span><span>{formatBRL(b.total)}</span>
            </div>
          </div>
          {b.notes && (
            <div className="mt-4 rounded-xl bg-neutral-50 dark:bg-neutral-700/40 p-3 text-sm text-neutral-600 dark:text-neutral-300">
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">Observações: </span>{b.notes}
            </div>
          )}
          <div className="mt-3 flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
            <CalendarCheck size={14} /> Validade: {b.validity || '7 dias'} · Emitido em {formatDate(b.createdAt)}
          </div>
        </Card>

        <Card>
          <h2 className="text-center text-lg font-extrabold text-neutral-800 dark:text-neutral-100">Deseja aprovar este orçamento?</h2>
          {b.status === 'aprovado' ? (
            <p className="mt-2 text-center text-sm text-success dark:text-green-400">Este orçamento já foi aprovado. O prestador entrará em contato.</p>
          ) : b.status === 'recusado' ? (
            <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">Este orçamento foi recusado. Fale com o prestador para ajustes.</p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="danger" onClick={() => handleDecision('recusado')}><X size={18} /> Recusar</Button>
                <Button variant="success" onClick={() => handleDecision('aprovado')}><Check size={18} /> Aprovar</Button>
              </div>
              <Button as="a" href={`https://wa.me/${company ? telToWhats(company.whatsapp) : ''}`} target="_blank" rel="noreferrer" variant="secondary" full size="sm" className="mt-2"><MessageCircle size={14} /> Tirar dúvidas no WhatsApp</Button>
            </>
          )}
        </Card>

        <footer className="mt-4 text-center text-xs text-neutral-400">
          {company?.email && <p>{company.email}</p>}
          {company?.phone && <p>{company.phone}</p>}
        </footer>
      </main>
    </div>
  );
}
