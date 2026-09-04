import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import {
  Navigation, CheckCircle2, Clock, MapPin, Phone, MessageCircle,
  AlertTriangle, Wrench, ChevronRight, Play, ExternalLink, Calendar,
  Sparkles,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader, EmptyState } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, formatBRL, telToWhats, todayISO } from '../lib/utils';
import { useToast } from '../components/Toast';

export default function TechRota() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const equipment = useLiveQuery(() => db.equipment.toArray(), []) || [];

  const techName = (user?.name || '').trim().toLowerCase();
  const techFirstName = (user?.firstName || '').trim().toLowerCase();

  // Filtra as OS atribuídas ao técnico logado (ou todas se for admin testando)
  const myOrders = useMemo(() => {
    return orders.filter((o) => {
      if (user?.role === 'admin') return true; // Dono vê tudo se quiser entrar aqui
      const t = (o.technician || '').trim().toLowerCase();
      if (!t) return false;
      return t === techName || t === techFirstName || t.includes(techFirstName);
    });
  }, [orders, user, techName, techFirstName]);

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

  function notifyArrival(o: any) {
    const c = getCustomer(o.customerId);
    const ph = c?.whatsapp || c?.phone;
    if (!ph) {
      toast('warning', 'Cliente sem telefone/WhatsApp cadastrado.');
      return;
    }
    const msg = `Olá, ${c?.name || 'cliente'}! Aqui é o técnico ${user?.firstName || ''} da ClimaPro. Estou a caminho do seu endereço para o atendimento da OS ${o.osNumber}. Previsão de chegada em breve! ❄️`;
    window.open(`https://wa.me/${telToWhats(ph)}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function quickStart(o: any) {
    try {
      await db.serviceOrders.update(o.id, { status: 'em_andamento' });
      toast('success', `OS ${o.osNumber} iniciada! Bom trabalho.`);
      navigate(`/app/servicos/${o.id}`);
    } catch {
      toast('error', 'Não foi possível atualizar o status.');
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* Top Header Cockpit */}
      <div className="rounded-2xl bg-gradient-to-r from-primary-800 to-primary-950 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold text-primary-200">
              <Sparkles size={12} /> Cockpit de Campo
            </span>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight">
              Olá, {user?.firstName || 'Técnico'}!
            </h1>
            <p className="text-xs text-primary-200">
              {stats.pendentes === 0 && stats.total > 0
                ? '🎉 Todas as ordens de hoje foram concluídas!'
                : `${stats.pendentes} atendimento(s) pendente(s) hoje`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black">{stats.concluidos}/{stats.total}</div>
            <div className="text-[11px] uppercase tracking-wider text-primary-300">Concluídos</div>
          </div>
        </div>

        {/* Barra de Progresso do Dia */}
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${stats.total > 0 ? (stats.concluidos / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Seletor Rápido de Data */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs">
          <div className="flex items-center gap-1.5 text-primary-200">
            <Calendar size={14} /> Data da rota:
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white outline-none focus:bg-white/20"
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
                className={`overflow-hidden rounded-2xl border transition-all ${
                  inProgress
                    ? 'border-primary-500 bg-primary-50/40 ring-2 ring-primary-500/20 dark:border-primary-600 dark:bg-primary-950/20'
                    : isDone
                    ? 'border-neutral-200 bg-white/60 opacity-80 dark:border-neutral-800 dark:bg-neutral-900/60'
                    : 'border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-800'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5 dark:border-neutral-700/60 dark:bg-neutral-800/60">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                      {o.time ? `🕒 ${o.time}` : 'Horário a combinar'}
                    </span>
                    <span className="text-xs text-neutral-400">· OS {o.osNumber}</span>
                  </div>
                  <StatusBadge status={o.status} />
                </div>

                {/* Conteúdo Principal */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                        {c?.name || 'Cliente'}
                      </h2>
                      <p className="mt-0.5 text-sm font-medium text-primary-700 dark:text-primary-300">
                        ❄️ {o.service}
                      </p>
                      {o.problem && (
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          <b>Problema relatado:</b> {o.problem}
                        </p>
                      )}
                      {eq && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                          <Wrench size={12} /> {eq.brand} {eq.model} · {eq.btus} BTU ({eq.installLocation || 'Geral'})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="mt-3 flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-danger" />
                    <span>{fullAddress || 'Endereço não informado'}</span>
                  </div>

                  {/* Barra de Ações Rápidas de Campo (1 toque) */}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {/* Waze / Maps */}
                    <button
                      type="button"
                      onClick={() => openWaze(fullAddress)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
                    >
                      <Navigation size={15} /> Waze
                    </button>
                    <button
                      type="button"
                      onClick={() => openMaps(fullAddress)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-700/60 dark:text-neutral-200"
                    >
                      <MapPin size={15} /> Maps
                    </button>

                    {/* Aviso a Caminho */}
                    <button
                      type="button"
                      onClick={() => notifyArrival(o)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      <MessageCircle size={15} /> A caminho
                    </button>

                    {/* Abrir OS / Iniciar */}
                    {!isDone && !inProgress && (
                      <button
                        type="button"
                        onClick={() => quickStart(o)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-primary-700 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary-800"
                      >
                        <Play size={14} /> Iniciar
                      </button>
                    )}
                    {(isDone || inProgress) && (
                      <button
                        type="button"
                        onClick={() => navigate(`/app/servicos/${o.id}`)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-neutral-800 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-neutral-900 dark:bg-neutral-700"
                      >
                        Ver detalhes <ChevronRight size={14} />
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
