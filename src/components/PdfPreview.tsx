import { useEffect, useState } from 'react';
import { Download, FileText, MessageCircle, X } from 'lucide-react';
import { Button } from './Button';

export interface PdfPreviewState {
  url: string;
  filename: string;
  title: string;
  build: () => { save: (name: string) => void };
}

export function usePdfPreview() {
  const [preview, setPreview] = useState<PdfPreviewState | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  function openPdf(doc: { output: (kind: 'blob') => Blob; save: (name: string) => void }, filename: string, title: string) {
    if (preview) URL.revokeObjectURL(preview.url);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPreview({ url, filename, title, build: () => doc });
  }

  function close() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  function download() {
    preview?.build().save(preview.filename);
  }

  return { preview, openPdf, close, download };
}

export function PdfPreviewModal({
  preview,
  onClose,
  onDownload,
  whatsappHref,
}: {
  preview: PdfPreviewState | null;
  onClose: () => void;
  onDownload: () => void;
  whatsappHref?: string;
}) {
  if (!preview) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950/90">
      <div className="flex items-center gap-2 border-b border-white/10 bg-neutral-900 px-3 py-2.5 text-white sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <FileText size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{preview.title}</p>
          <p className="truncate text-[11px] text-neutral-400">{preview.filename}</p>
        </div>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white sm:inline-flex"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
        )}
        <Button size="sm" variant="light" onClick={onDownload}>
          <Download size={15} /> Baixar
        </Button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar para o app"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
        >
          <X size={19} />
        </button>
      </div>
      <div className="min-h-0 flex-1 p-2 sm:p-4">
        <iframe
          title={preview.title}
          src={preview.url}
          className="h-full w-full rounded-xl border border-white/10 bg-white"
        />
      </div>
      <div className="flex gap-2 border-t border-white/10 bg-neutral-900 p-3 sm:hidden">
        <Button variant="outline" full onClick={onClose} className="!border-white/20 !bg-transparent !text-white">
          ← Voltar
        </Button>
        {whatsappHref && (
          <Button as="a" href={whatsappHref} target="_blank" rel="noreferrer" full className="!bg-emerald-500">
            <MessageCircle size={15} /> Enviar
          </Button>
        )}
        <Button variant="light" full onClick={onDownload}>
          <Download size={15} /> Baixar
        </Button>
      </div>
    </div>
  );
}
