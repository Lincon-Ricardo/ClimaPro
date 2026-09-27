import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, Sparkles, Snowflake, Wind, Tornado, Crown, Zap, ShieldCheck,
  X, ChevronDown, Flame, BadgePercent, Headset, Infinity as InfinityIcon,
  Users, Timer, Gem, BadgeCheck, Star, Receipt, RefreshCw, ExternalLink,
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { PLANS, formatLimit, trialDaysLeft } from '../lib/plans';
import { isLifetimeSub, isVitalicioUser, LIFETIME_LABEL, LIFETIME_PRICE } from '../lib/lifetime';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { formatBRL } from '../lib/utils';
import { startCheckout, fetchInvoices, verifyPayment, type CheckoutMethod, type Invoice } from '../lib/billing';
import {
  checkoutError, savePendingCheckout, loadPendingCheckout, clearPendingCheckout,
  invoiceStatus, type PendingCheckout,
} from '../lib/billingErrors';
import { errMsg } from '../lib/errors';
import { getRecommendedPlan } from '../lib/plans';
import type { ReactNode } from 'react';

const PLAN_STYLE: Record<string, { icon: ReactNode; gradient: string; glow: string; accent: string }> = {
  start: {
    icon: <Snowflake size={26} />,
    gradient: 'from-sky-500 to-cyan-400',
    glow: 'shadow-sky-500/20',
    accent: 'text-sky-500',
  },
  pro: {
    icon: <Wind size={26} />,
    gradient: 'from-violet-600 via-primary-600 to-sky-500',
    glow: 'shadow-primary-500/40',
    accent: 'text-primary-500',
  },
  master: {
    icon: <Tornado size={26} />,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-orange-500/20',
    accent: 'text-orange-500',
  },
};

const COMPARISON: { label: string; values: (string | boolean)[] }[] = [
  { label: 'OS por mês', values: ['30', '150', 'Ilimitadas'] },
  { label: 'Técnicos', values: ['1', '5', 'Ilimitados'] },
  { label: 'Cockpit do técnico', values: [true, true, true] },
  { label: 'Laudo por voz', values: [false, true, true] },
  { label: 'Superaquecimento', values: [false, true, true] },
  { label: 'BI + ranking', values: [false, true, true] },
  { label: 'Cobrança WhatsApp', values: [false, true, true] },
  { label: 'Suporte prioritário', values: [false, true, true] },
  { label: 'API + multi-filial', values: [false, false, true] },
  { label: 'Gerente dedicado', values: [false, false, true] },
];

const FAQS: { q: string; a: string }[] = [
  { q: 'Preciso de cartão para testar?', a: 'Não. Os 14 dias grátis liberam o Pro completo sem pedir nenhum dado de pagamento.' },
  { q: 'Tem fidelidade ou multa?', a: 'Não. Assinatura mensal, cancele quando quiser e mantenha todos os seus dados e clientes.' },
  { q: 'Como pago?', a: 'Via Asaas: PIX (aprovação imediata), boleto ou cartão de crédito com cobrança recorrente.' },
  { q: 'E se eu não gostar?', a: 'Você tem 7 dias de garantia após a primeira cobrança: devolvemos 100%, sem perguntas. Veja em /reembolso.' },
  { q: 'O que acontece se eu estourar o limite?', a: 'Avisamos antes e você pode fazer upgrade em 1 clique, sem perder nada. O excedente nunca é apagado.' },
  { q: 'Meus técnicos pagam algo?', a: 'Não. Só o dono assina. Técnicos entram de graça dentro do limite do plano.' },
  { q: 'Meus dados estão seguros?', a: 'Sim. Banco criptografado, backup diário e você exporta tudo quando quiser. Seguimos a LGPD — veja em /privacidade.' },
];

function PixModal({ pix, onClose, lifetime = false }: { pix: { qr: string | null; code: string | null; url: string | null }; onClose: () => void; lifetime?: boolean }) {
  const toast = useToast();
  const [checking, setChecking] = useState(false);

  async function checkPayment() {
    setChecking(true);
    try {
      const { supabase } = await import('../lib/supabaseClient');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessão expirou. Entre novamente.');
      const response = await fetch('/api/billing/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      });
      const body = (await response.json().catch(() => ({}))) as { synced?: boolean; message?: string; error?: string };
      if (!response.ok) throw new Error(body.error || 'Falha na verificação.');
      if (body.synced) {
        const { track } = await import('../lib/analytics');
        track('checkout_paid');
        clearPendingCheckout();
        toast('success', 'Pagamento confirmado! Acesso liberado.');
        window.location.assign('/app');
      } else {
        toast('info', body.message || 'Ainda não identificamos o PIX. Aguarde 30s e tente de novo.');
      }
    } catch (e: unknown) {
      toast('error', errMsg(e, 'Não foi possível verificar.'));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5 text-center sm:p-6 dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-black text-neutral-900 dark:text-white">{lifetime ? 'Pioneiro Vitalício · PIX único' : 'Pague com PIX'}</h3>
        <p className="mt-1 text-xs text-neutral-500">
          {lifetime
            ? 'Pagamento único: após confirmar, seu acesso vira vitalício. Escaneie e clique em Já paguei.'
            : 'PIX vale para a 1ª parcela — a recorrência mensal é no cartão. Escaneie e clique em Já paguei.'}
        </p>
        {pix.qr && <img src={pix.qr} alt="QR Code PIX" className="mx-auto mt-4 h-44 w-44 max-w-full rounded-2xl border xs:h-52 xs:w-52" />}
        {pix.code && (
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(pix.code || ''); toast('success', 'Código PIX copiado!'); }}
            className="mt-3 w-full break-all rounded-xl bg-neutral-100 p-3 text-left text-[11px] font-mono text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
          >
            {pix.code}
          </button>
        )}
        <div className={`mt-4 grid gap-2 ${pix.url ? 'grid-cols-1 xs:grid-cols-2' : 'grid-cols-1'}`}>
          {pix.url && (
            <Button variant="outline" onClick={() => window.open(pix.url || '', '_blank')}>Abrir fatura</Button>
          )}
          <Button disabled={checking} onClick={checkPayment}>{checking ? 'Verificando…' : 'Já paguei'}</Button>
        </div>
        <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-xs text-neutral-400 hover:underline">Fechar</button>
      </div>
    </div>
  );
}

function PendingModal({ pending, onClose, onPaid }: { pending: PendingCheckout; onClose: () => void; onPaid: () => void }) {
  const toast = useToast();
  const [checking, setChecking] = useState(false);

  async function checkPayment() {
    setChecking(true);
    try {
      const result = await verifyPayment();
      if (result.synced) {
        const { track } = await import('../lib/analytics');
        track('checkout_paid');
        clearPendingCheckout();
        toast('success', 'Pagamento confirmado! Acesso liberado.');
        onPaid();
      } else {
        toast('info', result.message || 'Ainda não identificamos o pagamento. Aguarde 30s e tente de novo.');
      }
    } catch (e: unknown) {
      toast('error', errMsg(e, 'Não foi possível verificar.'));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-3 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5 text-center sm:p-6 dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-black text-neutral-900 dark:text-white">Conclua seu pagamento</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Cobrança <b>{pending.subscriptionId.slice(0, 12)}…</b> criada no Asaas.
          {pending.checkoutUrl ? ' Abra a página de pagamento e, depois de pagar, clique em Já paguei.' : ' Conclua na página do Asaas e clique em Já paguei.'}
        </p>
        <div className="mt-4 grid gap-2">
          {pending.checkoutUrl && (
            <Button variant="outline" onClick={() => window.open(pending.checkoutUrl || '', '_blank')}>
              <ExternalLink size={15} /> Abrir página de pagamento
            </Button>
          )}
          <Button disabled={checking} onClick={checkPayment}>{checking ? 'Verificando…' : 'Já paguei'}</Button>
        </div>
        <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-xs text-neutral-400 hover:underline">Fechar (continuo depois)</button>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-bold text-neutral-800 dark:text-neutral-100"
      >
        {q}
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="border-t border-neutral-100 px-4 py-3 text-xs leading-relaxed text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">{a}</p>}
    </div>
  );
}

export default function Planos() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sub, plan, isTrial } = useSubscription();
  const lifetime = isLifetimeSub(sub) || isVitalicioUser(user);
  const isAdmin = user?.role === 'admin';
  const [busy, setBusy] = useState<string | null>(null);
  const [annual, setAnnual] = useState(false);
  // PIX primeiro: aprovação imediata e maior conversão no Brasil.
  const [method, setMethod] = useState<CheckoutMethod>('pix');
  const [pix, setPix] = useState<{ qr: string | null; code: string | null; url: string | null; lifetime?: boolean } | null>(null);
  const [pending, setPending] = useState<PendingCheckout | null>(() => loadPendingCheckout());
  const [pendingOpen, setPendingOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const left = sub ? trialDaysLeft(sub) : 0;
  const trialPct = Math.max(0, Math.min(100, ((14 - left) / 14) * 100));

  function price(p: number) {
    return annual ? p * 0.8 : p;
  }

  function rememberPending(subscriptionId: string, planKey: string, cycle: string, checkoutUrl: string | null, openModal: boolean) {
    const record: PendingCheckout = {
      subscriptionId, planKey, cycle, method, checkoutUrl, createdAt: new Date().toISOString(),
    };
    savePendingCheckout(record);
    setPending(record);
    if (openModal) setPendingOpen(true);
  }

  function handleCheckoutError(error: unknown) {
    const code = (error as { code?: string })?.code;
    const mapped = checkoutError(code, errMsg(error, 'Não foi possível iniciar o pagamento.'));
    toast('error', mapped.text);
    if (mapped.action === 'empresa') navigate('/app/empresa');
  }

  async function loadInvoices() {
    if (!isAdmin) return;
    setInvoicesLoading(true);
    try {
      setInvoices(await fetchInvoices());
    } catch {
      setInvoices(null);
    } finally {
      setInvoicesLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    setInvoicesLoading(true);
    fetchInvoices().then(setInvoices).catch(() => setInvoices(null)).finally(() => setInvoicesLoading(false));
  }, [isAdmin]);

  async function handleLifetime() {
    if (!isAdmin) { toast('info', 'Só o dono da conta pode assinar. Peça ao dono para concluir.'); return; }
    setBusy('lifetime');
    try {
      const { track } = await import('../lib/analytics');
      track('checkout_start', { plan: 'lifetime', cycle: 'lifetime', method });
      const result = await startCheckout('lifetime', 'lifetime', method);
      if (result.pixQr || result.pixCode) {
        rememberPending(result.subscriptionId, 'lifetime', 'lifetime', result.checkoutUrl, false);
        setPix({ qr: result.pixQr, code: result.pixCode, url: result.checkoutUrl, lifetime: true });
        toast('success', result.message || 'QR Code vitalício gerado! Pague e clique em Já paguei.');
        return;
      }
      if (result.checkoutUrl) {
        rememberPending(result.subscriptionId, 'lifetime', 'lifetime', result.checkoutUrl, false);
        window.location.assign(result.checkoutUrl);
        return;
      }
      rememberPending(result.subscriptionId, 'lifetime', 'lifetime', null, true);
      toast('info', result.message || 'Cobrança criada. Conclua o pagamento para virar vitalício.');
    } catch (error: unknown) {
      handleCheckoutError(error);
    } finally {
      setBusy(null);
    }
  }

  async function handleSubscribe(planKey: string) {
    if (lifetime) { toast('info', 'Você já é Pioneiro Vitalício. Nada a pagar. 👑'); return; }
    if (!isAdmin) { toast('info', 'Só o dono da conta pode assinar. Peça ao dono para concluir.'); return; }
    setBusy(planKey);
    try {
      const cycle = annual ? 'yearly' : 'monthly';
      const { track } = await import('../lib/analytics');
      track('checkout_start', { plan: planKey, cycle, method });
      const result = await startCheckout(planKey, cycle, method);
      if (method === 'pix' && (result.pixQr || result.pixCode)) {
        rememberPending(result.subscriptionId, planKey, cycle, result.checkoutUrl, false);
        setPix({ qr: result.pixQr, code: result.pixCode, url: result.checkoutUrl });
        toast('success', result.message || 'QR Code PIX gerado! Escaneie para pagar e depois clique em Já paguei.');
        return;
      }
      if (result.pixManual && result.message) {
        toast('info', result.message);
      }
      if (result.checkoutUrl) {
        rememberPending(result.subscriptionId, planKey, cycle, result.checkoutUrl, false);
        window.location.assign(result.checkoutUrl);
      } else {
        rememberPending(result.subscriptionId, planKey, cycle, null, true);
        toast('info', result.message || 'Assinatura criada. Conclua o pagamento para liberar o acesso.');
      }
    } catch (error: unknown) {
      handleCheckoutError(error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 pb-4">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-950 p-4 text-center text-white shadow-2xl xs:p-6 sm:p-8">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary-600/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-[80%] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-200 backdrop-blur-sm">
            <Sparkles size={12} />
            {isTrial ? `Teste grátis · ${left} dias restantes` : `Plano atual: ${plan.name}`}
          </span>
          <h1 className="mx-auto mt-3 max-w-2xl text-2xl font-black leading-tight tracking-tight sm:text-4xl">
            Escolha a potência do seu frio <span className="bg-gradient-to-r from-sky-300 to-primary-300 bg-clip-text text-transparent">❄️</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-neutral-300 sm:text-sm">
            Sem fidelidade, sem taxa escondida. Cancele quando quiser e mantenha seus dados.
            PIX, boleto ou cartão pelo Asaas.
          </p>

          {isTrial && (
            <div className="mx-auto mt-4 max-w-md rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-amber-200">
                <span className="flex items-center gap-1.5"><Flame size={14} /> Seu Pro grátis está acabando</span>
                <span>{left}/14 dias</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${trialPct}%` }} />
              </div>
            </div>
          )}

          {/* Toggle mensal/anual */}
          <div className="mx-auto mt-5 flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-2 text-xs font-black transition sm:px-5 ${!annual ? 'bg-white text-neutral-900 shadow' : 'text-neutral-300 hover:text-white'}`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-black transition sm:px-5 ${annual ? 'bg-emerald-400 text-neutral-900 shadow' : 'text-neutral-300 hover:text-white'}`}
            >
              Anual <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${annual ? 'bg-neutral-900 text-emerald-300' : 'bg-emerald-500/20 text-emerald-300'}`}>-20%</span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-neutral-300">
            <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-400" /> 14 dias grátis</span>
            <span className="flex items-center gap-1"><Zap size={13} className="text-amber-300" /> Ativação imediata</span>
            <span className="flex items-center gap-1"><Headset size={13} className="text-sky-300" /> Suporte em português</span>
          </div>

          <div className="mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-sm">
            {(['card', 'pix', 'boleto'] as CheckoutMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-full px-3 py-2 text-[11px] font-black uppercase transition xs:px-4 xs:text-xs sm:px-5 ${method === m ? 'bg-white text-neutral-900 shadow' : 'text-neutral-300 hover:text-white'}`}
              >
                {m === 'pix' ? 'PIX ⚡' : m === 'card' ? 'Cartão' : 'Boleto'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!isAdmin && !lifetime && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-xs font-bold text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
          👤 Você entrou como técnico: só o <b>dono da conta</b> pode assinar. Peça ao dono para concluir a compra.
        </div>
      )}

      {pending && !lifetime && (
        <button
          type="button"
          onClick={() => setPendingOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30"
        >
          <span className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
            <Timer size={15} /> Você tem um pagamento em aberto — clique para continuar
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-black text-amber-700 dark:text-amber-300">
            Continuar <ExternalLink size={13} />
          </span>
        </button>
      )}

      {lifetime ? (
        <div className="relative overflow-hidden rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-6 text-center shadow-xl sm:p-8 dark:border-amber-500/40 dark:from-amber-950/50 dark:via-neutral-900 dark:to-amber-950/30">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/30 blur-3xl" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-neutral-900 shadow">
            <BadgeCheck size={13} /> {LIFETIME_LABEL} ativo
          </span>
          <h2 className="mt-3 text-2xl font-black text-neutral-900 sm:text-3xl dark:text-white">Você é Pioneiro. Para sempre. 👑</h2>
          <p className="mx-auto mt-1.5 max-w-xl text-xs text-neutral-500 sm:text-sm dark:text-neutral-300">
            OS ilimitadas · técnicos ilimitados · zero mensalidade · zero tela de expirado. Sua blindagem já está valendo.
          </p>
          <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck size={15} /> Conta vitalícia verificada — nenhum plano consegue te cobrar de novo.
          </div>
        </div>
      ) : (
        <section className="relative overflow-hidden rounded-[28px] border border-amber-200/60 bg-neutral-950 text-white shadow-[0_30px_80px_-20px_rgba(245,158,11,.45)] dark:border-amber-400/30">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-orange-600/25 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
          <div className="relative grid min-w-0 grid-cols-1 gap-5 p-4 xs:p-6 sm:p-8 lg:grid-cols-[1.15fr_.85fr] lg:gap-8">
            <div className="min-w-0 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-neutral-950 shadow-lg">
                  <Crown size={13} /> Lote fundador
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-amber-100">
                  <Timer size={12} /> Fecha quando lotar — sem reabrir
                </span>
              </div>
              <h2 className="mt-4 break-words text-2xl font-black leading-[1.08] tracking-tight xs:text-[26px] sm:text-4xl">
                Pague <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent">1 vez.</span>
                <br />Use o ClimaPro para sempre.
              </h2>
              <p className="mt-2.5 max-w-lg text-[13px] leading-relaxed text-neutral-300 sm:text-sm">
                O {LIFETIME_LABEL} é para quem fundou o jogo com a gente: tudo do Master, sem mensalidade, sem renovação, sem pegadinha.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  { icon: <InfinityIcon size={15} />, t: 'OS ilimitadas para sempre', d: 'sem teto mensal' },
                  { icon: <Users size={15} />, t: 'Técnicos ilimitados', d: 'traga a equipe toda' },
                  { icon: <Gem size={15} />, t: 'Selo Pioneiro no app', d: 'status vitalício na conta' },
                  { icon: <ShieldCheck size={15} />, t: 'Garantia de 7 dias', d: '100% de volta, sem perguntas' },
                ].map((f) => (
                  <li key={f.t} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] px-3.5 py-2.5 backdrop-blur-sm">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 text-neutral-950 shadow">
                      {f.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold">{f.t}</span>
                      <span className="block text-[11px] text-neutral-400">{f.d}</span>
                    </span>
                    <Check size={16} className="ml-auto shrink-0 text-emerald-400" />
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-neutral-300">
                <span className="flex items-center gap-1.5"><Star size={12} className="text-amber-300" /> Se paga com 1 higienização</span>
                <span className="flex items-center gap-1.5"><Zap size={12} className="text-amber-300" /> Liberação automática via Asaas</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="relative overflow-hidden rounded-3xl border border-amber-200/50 bg-gradient-to-b from-white to-amber-50 p-5 text-neutral-900 shadow-2xl sm:p-6 dark:border-amber-300/30 dark:from-neutral-900 dark:to-amber-950/40 dark:text-white">
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-400/30 blur-2xl" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-300">Oferta única</span>
                  <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase text-white">-70% vs 5 anos de Master</span>
                </div>
                <div className="mt-3 space-y-1.5 rounded-2xl bg-neutral-100/80 p-3 text-xs font-bold text-neutral-500 dark:bg-white/10 dark:text-neutral-300">
                  <div className="flex justify-between"><span>Master · 1 ano</span><span className="line-through">{formatBRL(197 * 12)}</span></div>
                  <div className="flex justify-between"><span>Master · 5 anos</span><span className="line-through">{formatBRL(197 * 12 * 5)}</span></div>
                  <div className="flex justify-between border-t border-neutral-200 pt-1.5 text-neutral-900 dark:border-white/10 dark:text-white">
                    <span>Pioneiro · para sempre</span><span className="text-emerald-600 dark:text-emerald-300">{formatBRL(LIFETIME_PRICE)} único</span>
                  </div>
                </div>
                <div className="mt-4 flex items-end justify-center gap-1.5">
                  <span className="pb-2 text-xs font-bold text-neutral-400">12x ou à vista por</span>
                </div>
                <div className="-mt-1 break-words text-center text-4xl font-black tracking-tight xs:text-5xl sm:text-6xl">
                  {formatBRL(LIFETIME_PRICE)}
                </div>
                <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-400">pagamento único · sem mensalidade</p>
                <Button
                  full
                  size="lg"
                  disabled={busy === 'lifetime' || !isAdmin}
                  title={!isAdmin ? 'Somente o dono pode assinar' : undefined}
                  onClick={handleLifetime}
                  className="mt-4 !bg-gradient-to-r !from-amber-400 !to-orange-500 !text-neutral-950 text-base font-black shadow-xl shadow-orange-500/40 hover:brightness-110 active:scale-[.99]"
                >
                  <Crown size={19} /> {busy === 'lifetime' ? 'Gerando pagamento...' : !isAdmin ? 'Só o dono pode assinar' : 'Quero ser Pioneiro'}
                </Button>
                <p className="mt-2.5 text-center text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                  {method === 'pix' ? 'PIX com aprovação imediata' : method === 'boleto' ? 'Boleto à vista' : 'Cartão em até 12x'} · após pagar clique em <b>Já paguei</b>
                </p>
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck size={13} /> 7 dias de garantia incondicional
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CARDS ── */}
      {getRecommendedPlan() && (
        <div className="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-center text-xs font-bold text-primary-800 dark:border-primary-800 dark:bg-primary-950/30 dark:text-primary-200">
          🎯 Pela sua pesquisa, o ideal para você é o <b>{PLANS.find((x) => x.key === getRecommendedPlan())?.name}</b> — destacado abaixo.
        </div>
      )}
      <div className="grid min-w-0 grid-cols-1 items-stretch gap-5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {PLANS.map((p) => {
          const st = PLAN_STYLE[p.key];
          const current = plan.key === p.key && !isTrial;
          const hl = p.highlight;
          const recommended = getRecommendedPlan() === p.key;
          return (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-3xl border bg-white p-5 transition-all dark:bg-neutral-900 sm:p-6 ${
                hl
                  ? 'border-transparent bg-gradient-to-b from-primary-600 via-primary-600 to-primary-700 p-[2px] shadow-2xl shadow-primary-500/40 lg:-my-3 lg:scale-[1.03]'
                  : 'border-neutral-200 dark:border-neutral-700'
              }`}
            >
              <div className={hl ? 'flex h-full flex-col rounded-[22px] bg-neutral-950 p-5 text-white sm:p-6' : 'flex h-full flex-col'}>
                {recommended && !current && (
                  <span className="absolute -top-3.5 left-1/2 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-1 truncate rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-lg">
                    🎯 Ideal para você
                  </span>
                )}
                {hl && !recommended && (
                  <span className="absolute -top-3.5 left-1/2 flex max-w-[calc(100%-2rem)] -translate-x-1/2 animate-pulse items-center gap-1 truncate rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-neutral-900 shadow-lg">
                    <Crown size={12} /> Mais escolhido
                  </span>
                )}
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${st.gradient} ${st.glow}`}>
                  {st.icon}
                </div>
                <h2 className={`mt-3 text-xl font-black ${hl ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>{p.name}</h2>
                <p className={`text-xs ${hl ? 'text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}`}>{p.tagline}</p>
                <div className="mt-3 flex items-end gap-1">
                  {annual && (
                    <span className={`mr-1 pb-1 text-sm line-through ${hl ? 'text-neutral-400' : 'text-neutral-400'}`}>{formatBRL(p.price)}</span>
                  )}
                  <span className={`text-4xl font-black tracking-tight ${hl ? 'bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent' : 'text-neutral-900 dark:text-white'}`}>
                    {formatBRL(price(p.price))}
                  </span>
                  <span className={`pb-1.5 text-xs ${hl ? 'text-neutral-300' : 'text-neutral-400'}`}>/mês</span>
                </div>
                {annual && (
                  <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-500">
                    <BadgePercent size={12} /> {formatBRL(p.price * 12)} → {formatBRL(price(p.price) * 12)}/ano
                  </span>
                )}
                <div className={`mt-2 rounded-xl px-3 py-2 text-[11px] font-bold ${hl ? 'bg-white/10 text-primary-200' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                  {formatLimit(p.osPerMonth)} OS/mês · {formatLimit(p.technicians)} técnico(s)
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-xs ${hl ? 'text-neutral-200' : 'text-neutral-600 dark:text-neutral-300'}`}>
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <Check size={11} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  full
                  variant={hl ? 'light' : 'outline'}
                  className={`mt-5 font-black ${hl ? 'shadow-lg shadow-primary-500/30' : ''}`}
                  disabled={busy === p.key || current || lifetime || !isAdmin}
                  title={!isAdmin && !lifetime ? 'Somente o dono pode assinar' : undefined}
                  onClick={() => handleSubscribe(p.key)}
                >
                  {lifetime ? '👑 Incluso no vitalício' : current ? '✓ Seu plano atual' : busy === p.key ? 'Abrindo...' : !isAdmin ? 'Só o dono pode assinar' : p.cta}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MINHAS COBRANÇAS ── */}
      {isAdmin && !lifetime && (
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-black text-neutral-900 dark:text-white">
              <Receipt size={18} /> Minhas cobranças
            </h2>
            <button
              type="button"
              onClick={loadInvoices}
              disabled={invoicesLoading}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-950/40"
            >
              <RefreshCw size={13} className={invoicesLoading ? 'animate-spin' : ''} />
              {invoicesLoading ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>
          {!invoices || invoices.length === 0 ? (
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {invoicesLoading ? 'Buscando cobranças no Asaas…' : 'Nenhuma cobrança encontrada. Ao assinar, sua fatura aparece aqui para pagar ou reemitir.'}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {invoices.map((inv) => {
                const st = invoiceStatus(inv.status);
                return (
                  <li key={inv.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2.5 dark:border-neutral-700">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                      st.tone === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : st.tone === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      : st.tone === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}>
                      {st.label}
                    </span>
                    <span className="text-sm font-black text-neutral-900 dark:text-white">{formatBRL(inv.value)}</span>
                    {inv.dueDate && <span className="text-[11px] text-neutral-500">vence {inv.dueDate.split('-').reverse().join('/')}</span>}
                    <span className="ml-auto flex gap-2">
                      {inv.payUrl && (
                        <Button size="sm" variant="outline" onClick={() => window.open(inv.payUrl || '', '_blank')}>
                          <ExternalLink size={13} /> Pagar
                        </Button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {/* ── COMPARATIVO ── */}
      <Card className="overflow-hidden p-0">
        <h2 className="px-4 pt-4 text-base font-black text-neutral-900 dark:text-white sm:px-5">Compare tudo, sem letra miúda</h2>
        <div className="table-scroll mt-2">
          <table className="w-full min-w-[560px] text-xs sm:min-w-0">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="px-4 py-2.5 text-left font-semibold text-neutral-400 sm:px-5">Recurso</th>
                {PLANS.map((p) => (
                  <th key={p.key} className={`px-2 py-2.5 text-center font-black ${p.highlight ? 'text-primary-600 dark:text-primary-300' : 'text-neutral-600 dark:text-neutral-300'}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-neutral-50/60 dark:bg-neutral-900/40' : ''}>
                  <td className="px-4 py-2 font-medium text-neutral-600 dark:text-neutral-300 sm:px-5">{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className="px-2 py-2 text-center font-bold text-neutral-800 dark:text-neutral-100">
                      {typeof v === 'boolean' ? (
                        v ? <Check size={15} className="mx-auto text-emerald-500" /> : <X size={15} className="mx-auto text-neutral-300 dark:text-neutral-600" />
                      ) : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── FAQ ── */}
      <div>
        <h2 className="mb-2.5 text-base font-black text-neutral-900 dark:text-white">Perguntas frequentes</h2>
        <div className="space-y-2">
          {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-sm font-black text-emerald-800 dark:text-emerald-200">
            <ShieldCheck size={18} /> Garantia incondicional de 7 dias
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
            Pagou e não gostou? Devolvemos 100% sem perguntas. Sem fidelidade, sem multa, cancele quando quiser e mantenha seus dados.
            Pagamento seguro pelo Asaas · PIX, boleto ou cartão · Nota fiscal.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <span>✓ 14 dias grátis sem cartão</span>
            <span>✓ Suporte em português</span>
            <span>✓ Seus dados exportáveis</span>
          </div>
        </div>
      </Card>

      <Card className="border-dashed">
        <p className="text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          💡 <b>Como funciona:</b> você testa 14 dias grátis no <b>Clima Ideal (Pro)</b>. Depois escolhe o plano ideal.
          O pagamento é feito pelo Asaas (PIX, boleto ou cartão) e liberamos seu acesso automaticamente.
          Dúvidas legais: <a href="/termos" className="font-bold underline">Termos</a> · <a href="/privacidade" className="font-bold underline">Privacidade</a> · <a href="/reembolso" className="font-bold underline">Reembolso</a>
        </p>
      </Card>

      {pix && (
        <PixModal
          pix={pix}
          lifetime={pix.lifetime === true}
          onClose={() => setPix(null)}
        />
      )}

      {pendingOpen && pending && (
        <PendingModal
          pending={pending}
          onClose={() => setPendingOpen(false)}
          onPaid={() => { setPending(null); setPendingOpen(false); window.location.assign('/app'); }}
        />
      )}
    </div>
  );
}
