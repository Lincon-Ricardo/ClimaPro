import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useAuth } from '../context/AuthContext';
import { useMyOrders } from '../hooks/useTechOrders';
import { db } from '../lib/db';
import {
  Navigation, MapPin, MessageCircle,
  Wrench, ChevronRight, Play, Calendar,
  Sparkles,
} from 'lucide-react';
import { EmptyState } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { telToWhats, todayISO } from '../lib/utils';
import { useToast } from '../components/Toast';

export default function TechRota() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const equipment = useLiveQuery(() => db.equipment.toArray(), []) || [];

  const myOrders = useMyOrders(orders);

  // Filtra pelo dia selecionado
  const dayOrders = useMemo(() => {
    return myOrders
      .filter((o) => (o.date || todayISO()) === selectedDate)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [myOrders, selectedDate]);

  const stats = useMemo(() => {
    const total = dayOrders.length;
    const concluidos = dayOrders.filter((o) => o.status === 'concluido').length;
    const emAndamento = dayOrders.filter((o) => o.status === 'em_andamento').length;
    const pendentes = total - concluidos;
    return { total, concluidos, emAndamento, pendentes };
  }, [dayOrders]);

  function getCustomer(id: string) {
    return customers.find((c) => c.id === id);
  }

  function getEquipment(id?: string) {
    return equipment.find((e) => e.id === id);
  }

  function openMaps(address: string) {
    if (!address) {
      toast('warning', 'Endereço não cadastrado nesta OS.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }

  function openWaze(address: string) {
    if (!address) {
      toast('warning', 'Endereço não cadastrado nesta OS.');
      return;
    }
    const url = `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
    window.open(url, '_blank');
  }

  function notifyArrival(o: { customerId: string; osNumber: string }) {
    const c = getCustomer(o.customerId);
    const ph = c?.whatsapp || c?.phone;
    if (!ph) {
      toast('warning', 'Cliente sem telefone/WhatsApp cadastrado.');
      return;
    }
    const msg = `Olá, ${c?.name || 'cliente'}! Aqui é o técnico ${user?.firstName || ''} da ClimaPro. Estou a caminho do seu endereço para o atendimento da OS ${o.osNumber}. Previsão de chegada em breve! ❄️`;
    window.open(`https://wa.me/${telToWhats(ph)}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function quickStart(o: { id: string; osNumber: string }) {
    try {
      await db.serviceOrders.update(o.id, { status: 'em_andamento' });
      toast('success', `OS ${o.osNumber} iniciada! Bom trabalho.`);
      navigate(`/app/servicos/${o.id}`);
    } catch {
      toast('error', 'Não foi possível atualizar o status.');
    }
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4">
      {/* Top Header Cockpit */}
      <div className="auth-shell relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071f4c] via-[#0b3d91] to-[#1e7fc0] p-5 text-white shadow-[0_24px_70px_-24px_rgba(11,61,145,.7)] sm:p-6">
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-sky-100 backdrop-blur">
              <Sparkles size={12} /> Cockpit de Campo
            </span>
            <h1 className="font-display mt-2 break-words text-[26px] font-extrabold leading-tight tracking-tight sm:text-3xl">
              Olá, {user?.firstName || 'Técnico'}!
            </h1>
            <p className="mt-1 break-words text-[13px] font-medium text-sky-100/90">
              {stats.pendentes === 0 && stats.total > 0
                ? '🎉 Todas as ordens de hoje foram concluídas!'
                : `${stats.pendentes} atendimento(s) pendente(s) hoje`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/20 backdrop-blur sm:flex-col sm:gap-0 sm:px-5">
            <div className="font-display text-3xl font-black leading-none">{stats.concluidos}/{stats.total}</div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-200">Concluídos</div>
          </div>
        </div>

        {/* Barra de Progresso do Dia */}
        <div className="relative mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.concluidos / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Seletor Rápido de Data */}
        <div className="relative mt-4 flex flex-col gap-2 border-t border-white/15 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-sky-100">
            <Calendar size={15} /> Data da rota:
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-2xl border border-white/25 bg-white/15 px-3.5 py-2.5 text-sm font-bold text-white outline-none backdrop-blur transition focus:border-sky-300 focus:bg-white/20 dark:[color-scheme:dark] sm:w-auto"
          />
        </div>
      </div>

      {/* Lista de Atendimentos da Rota */}
      {dayOrders.length === 0 ? (
        <EmptyState
          icon={<Navigation size={28} />}
          title="Nenhum atendimento para este dia"
          subtitle="Sua rota está livre. Verifique outra data ou consulte a sua empresa."
        />
      ) : (
        <div className="space-y-3">
          {dayOrders.map((o, idx) => {
            const c = getCustomer(o.customerId);
            const eq = getEquipment(o.equipmentId);
            const fullAddress = o.address || [c?.street, c?.number, c?.district, c?.city].filter(Boolean).join(', ');
            const isDone = o.status === 'concluido';
            const inProgress = o.status === 'em_andamento';

            return (
              <div
                key={o.id}
                className={`cp-card overflow-hidden !p-0 transition-all duration-200 ${
                  inProgress
                    ? '!border-primary-400 ring-2 ring-primary-500/30 dark:!border-sky-400/60 dark:ring-sky-400/25'
                    : isDone
                    ? 'opacity-90'
                    : 'hover:-translate-y-0.5'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/70 bg-neutral-50/80 px-3.5 py-2.5 sm:px-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-700 to-sky-500 text-xs font-black text-white shadow">
                      {idx + 1}
                    </span>
                    <span className="text-[13px] font-extrabold text-neutral-800 dark:text-white sm:text-sm">
                      {o.time ? `🕒 ${o.time}` : 'Horário a combinar'}
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-400">· OS {o.osNumber}</span>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                {/* Conteúdo Principal */}
                <div className="p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display break-words text-[17px] font-extrabold leading-tight text-neutral-900 dark:text-white">
                        {c?.name || 'Cliente'}
                      </h2>
                      <p className="mt-0.5 break-words text-sm font-bold text-primary-700 dark:text-sky-300">
                        ❄️ {o.service}
                      </p>
                      {o.problem && (
                        <p className="mt-1 break-words text-xs leading-relaxed text-neutral-500 dark:text-neutral-300">
                          <b className="text-neutral-700 dark:text-neutral-100">Problema:</b> {o.problem}
                        </p>
                      )}
                      {eq && (
                        <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-xl bg-neutral-100 px-2.5 py-1.5 text-[11px] font-bold text-neutral-700 dark:bg-white/10 dark:text-neutral-100">
                          <Wrench size={12} className="shrink-0" /> <span className="truncate">{eq.brand} {eq.model} · {eq.btus} BTU ({eq.installLocation || 'Geral'})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="mt-3 flex items-start gap-2 rounded-2xl bg-neutral-50 px-3 py-2.5 text-xs font-medium text-neutral-600 dark:bg-white/5 dark:text-neutral-200">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-red-500" />
                    <span className="break-words">{fullAddress || 'Endereço não informado'}</span>
                  </div>

                  {/* Barra de Ações Rápidas de Campo (1 toque) */}
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5">
                    {/* Waze / Maps */}
                    <button
                      type="button"
                      onClick={() => openWaze(fullAddress)}
                      className="flex min-h-[60px] items-center justify-center gap-1.5 rounded-2xl border border-sky-300 bg-sky-50 px-2 text-[13px] font-extrabold text-sky-800 shadow-sm transition active:scale-[.97] hover:bg-sky-100 dark:border-sky-400/50 dark:bg-sky-500/20 dark:text-sky-100 dark:hover:bg-sky-500/30"
                    >
                      <Navigation size={17} strokeWidth={2.5} /> Waze
                    </button>
                    <button
                      type="button"
                      onClick={() => openMaps(fullAddress)}
                      className="flex min-h-[60px] items-center justify-center gap-1.5 rounded-2xl border border-neutral-300 bg-white px-2 text-[13px] font-extrabold text-neutral-700 shadow-sm transition active:scale-[.97] hover:bg-neutral-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                    >
                      <MapPin size={17} strokeWidth={2.5} /> Maps
                    </button>

                    {/* Aviso a Caminho */}
                    <button
                      type="button"
                      onClick={() => notifyArrival(o)}
                      className="flex min-h-[60px] items-center justify-center gap-1.5 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-500 to-emerald-600 px-2 text-[13px] font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(16,185,129,.8)] transition active:scale-[.97] hover:brightness-110"
                    >
                      <MessageCircle size={17} strokeWidth={2.5} /> A caminho
                    </button>

                    {/* Abrir OS / Iniciar */}
                    {!isDone && !inProgress && (
                      <button
                        type="button"
                        onClick={() => quickStart(o)}
                        className="cp-btn-primary flex min-h-[60px] items-center justify-center gap-1.5 rounded-2xl px-2 text-[13px] font-extrabold text-white transition active:scale-[.97]"
                      >
                        <Play size={15} strokeWidth={2.5} /> Iniciar
                      </button>
                    )}
                    {(isDone || inProgress) && (
                      <button
                        type="button"
                        onClick={() => navigate(`/app/servicos/${o.id}`)}
                        className="flex min-h-[60px] items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 px-2 text-[13px] font-extrabold text-white transition active:scale-[.97] hover:bg-black dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                      >
                        Detalhes <ChevronRight size={15} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
