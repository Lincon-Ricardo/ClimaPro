import { useState } from 'react';
import {
  ArrowLeft, MessageCircle, FileDown, CalendarDays, Clock,
  Trash2, Loader2, MoreHorizontal, X, Download,
} from 'lucide-react';

interface OsHeaderProps {
  osNumber: string;
  customerName: string;
  dateLabel: string;
  time?: string;
  technician?: string;
  statusLabel: string;
  statusClass?: string;
  valueLabel: string;
  isPaid: boolean;
  waHref?: string | null;
  pdfBusy: boolean;
  onPdf: () => void;
  onPdfDownload: () => void;
  onAgenda: () => void;
  agendaLabel: string;
  onReschedule: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function OsHeader(p: OsHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const tile =
    'flex min-w-0 flex-col items-center gap-1 rounded-2xl border px-1.5 py-3 text-center transition active:scale-[.97] disabled:opacity-60';

  return (
    <div className="min-w-0 overflow-hidden rounded-[28px] border border-neutral-200/70 bg-white shadow-card dark:border-white/10 dark:bg-neutral-900">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#071f4c] via-[#0b3d91] to-[#1e7fc0] p-4 text-white sm:p-5 dark:from-[#0a1330] dark:via-[#0b2a63] dark:to-[#123f86]">
        <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <button
            type="button"
            onClick={p.onBack}
            aria-label="Voltar para serviços"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-lg font-black tracking-tight sm:text-xl">OS Nº {p.osNumber}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${p.statusClass || 'bg-white/15 text-white'}`}>
                {p.statusLabel}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[13px] font-medium text-sky-100/90">
              {p.customerName} · {p.dateLabel}{p.time ? ` às ${p.time}` : ''}
            </p>
          </div>
          <span className={`hidden shrink-0 rounded-2xl px-3 py-2 text-right xs:block ${p.isPaid ? 'bg-emerald-400/20 ring-1 ring-emerald-300/40' : 'bg-amber-400/20 ring-1 ring-amber-300/40'}`}>
            <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">{p.isPaid ? 'Recebido' : 'A receber'}</span>
            <span className="block text-base font-black leading-tight">{p.valueLabel}</span>
          </span>
        </div>
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
            <Clock size={12} /> {p.dateLabel}
          </span>
          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
            🧑‍🔧 <span className="truncate">{p.technician || 'Sem técnico'}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15 xs:hidden">
            {p.isPaid ? '✅' : '⏳'} {p.valueLabel}
          </span>
        </div>
      </div>

      <div className={`grid min-w-0 gap-2 p-3 sm:gap-2.5 sm:p-4 ${p.waHref ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {p.waHref && (
          <a
            href={p.waHref}
            target="_blank"
            rel="noreferrer"
            className={`${tile} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15">
              <MessageCircle size={19} />
            </span>
            <span className="w-full truncate text-[12px] font-extrabold leading-tight">WhatsApp</span>
            <span className="hidden w-full truncate text-[10px] leading-tight opacity-70 xs:block">Chamar cliente</span>
          </a>
        )}
        <button
          type="button"
          onClick={p.onPdf}
          disabled={p.pdfBusy}
          className={`${tile} border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/15">
            {p.pdfBusy ? <Loader2 size={19} className="animate-spin" /> : <FileDown size={19} />}
          </span>
          <span className="w-full truncate text-[12px] font-extrabold leading-tight">{p.pdfBusy ? 'Gerando…' : 'Ver PDF'}</span>
          <span className="hidden w-full truncate text-[10px] leading-tight opacity-70 xs:block">Prévia na tela</span>
        </button>
        <button
          type="button"
          onClick={p.onAgenda}
          className={`${tile} border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/15">
            <CalendarDays size={19} />
          </span>
          <span className="w-full truncate text-[12px] font-extrabold leading-tight">{p.agendaLabel}</span>
          <span className="hidden w-full truncate text-[10px] leading-tight opacity-70 xs:block">
            {p.agendaLabel === 'Agendar' ? 'Escolher data' : 'Ver calendário'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`${tile} border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 sm:hidden dark:border-white/10 dark:bg-white/5 dark:text-neutral-200`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-500/15">
            <MoreHorizontal size={19} />
          </span>
          <span className="w-full truncate text-[12px] font-extrabold leading-tight">Mais</span>
          <span className="hidden w-full truncate text-[10px] leading-tight opacity-70 xs:block">Baixar · excluir</span>
        </button>
        <button
          type="button"
          onClick={p.onReschedule}
          title="Mudar data/hora"
          className={`${tile} hidden border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:bg-primary-50 sm:flex dark:border-white/10 dark:bg-white/5 dark:text-neutral-200`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-500/10">
            <Clock size={19} />
          </span>
          <span className="w-full truncate text-[12px] font-extrabold leading-tight">Reagendar</span>
          <span className="hidden w-full truncate text-[10px] leading-tight opacity-70 xs:block">Data e hora</span>
        </button>
        <button
          type="button"
          onClick={p.onDelete}
          title="Excluir serviço"
          aria-label="Excluir serviço"
          className={`${tile} hidden border-red-200 bg-red-50 text-red-600 hover:bg-red-100 sm:flex dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/15">
            <Trash2 size={18} />
          </span>
          <span className="w-full truncate text-[12px] font-extrabold leading-tight">Excluir</span>
          <span className="hidden w-full truncate text-[10px] leading-tight opacity-70 xs:block">Remover OS</span>
        </button>
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-2xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-black text-neutral-800 dark:text-white">Opções da OS {p.osNumber}</span>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 dark:bg-white/10">
                <X size={17} />
              </button>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { setMoreOpen(false); p.onPdfDownload(); }}
                className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 px-4 py-3.5 text-left font-bold text-neutral-800 active:scale-[.99] dark:border-white/10 dark:text-white"
              >
                <Download size={19} className="shrink-0 text-sky-600" />
                <span>Baixar PDF direto<span className="block text-[11px] font-medium text-neutral-400">Salva na hora, sem prévia</span></span>
              </button>
              <button
                type="button"
                onClick={() => { setMoreOpen(false); p.onReschedule(); }}
                className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 px-4 py-3.5 text-left font-bold text-neutral-800 active:scale-[.99] dark:border-white/10 dark:text-white"
              >
                <Clock size={19} className="shrink-0 text-violet-600" />
                <span>Reagendar<span className="block text-[11px] font-medium text-neutral-400">Mudar data e hora</span></span>
              </button>
              <button
                type="button"
                onClick={() => { setMoreOpen(false); p.onDelete(); }}
                className="flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-left font-bold text-red-700 active:scale-[.99] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                <Trash2 size={19} className="shrink-0" />
                <span>Excluir OS<span className="block text-[11px] font-medium opacity-70">Não pode desfazer</span></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
