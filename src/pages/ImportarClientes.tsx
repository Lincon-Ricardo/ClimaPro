import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { db } from '../lib/db';
import { parseCustomersCsv, downloadCsvExample, type CustomerRow } from '../lib/csv';
import { customerSchema, parseFormData } from '../lib/schemas';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/Toast';
import { errMsg } from '../lib/errors';

export default function ImportarClientes() {
  const navigate = useNavigate();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setDone(0);
    try {
      const text = await file.text();
      const parsed = parseCustomersCsv(text);
      setRows(parsed.rows);
      setErrors(parsed.errors);
      if (!parsed.rows.length) toast('error', 'Nenhum cliente válido no arquivo. Baixe o modelo.');
      else toast('success', `${parsed.rows.length} cliente(s) prontos para importar.`);
    } catch (e: unknown) {
      toast('error', 'Não foi possível ler o arquivo: ' + errMsg(e));
    }
  }

  async function handleImport() {
    if (!rows.length || importing) return;
    setImporting(true);
    let ok = 0;
    const problems: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const result = parseFormData(customerSchema, {
        ...r,
        name: r.name,
        phone: r.phone || '',
        whatsapp: r.whatsapp || r.phone || '',
        email: r.email || '',
      });
      if (!result.valid) {
        problems.push(`Linha ${i + 2} (${r.name}): dados inválidos.`);
        continue;
      }
      try {
        await db.customers.add({
          id: crypto.randomUUID(),
          name: r.name.trim(),
          phone: r.phone || '',
          whatsapp: r.whatsapp || r.phone || '',
          email: r.email || '',
          document: r.document || '',
          street: r.street || '',
          number: r.number || '',
          complement: r.complement || '',
          district: r.district || '',
          city: r.city || '',
          zip: r.zip || '',
          notes: r.notes || '',
          createdAt: new Date().toISOString().slice(0, 10),
        });
        ok++;
        setDone(ok);
      } catch (e: unknown) {
        problems.push(`Linha ${i + 2} (${r.name}): ${errMsg(e)}`);
      }
    }
    setErrors(problems);
    setImporting(false);
    if (ok) toast('success', `${ok} cliente(s) importados!`);
    if (problems.length) toast('warning', `${problems.length} linha(s) com problema. Veja abaixo.`);
    if (ok && !problems.length) navigate('/app/clientes');
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <PageHeader
        title="Importar clientes"
        subtitle="Planilha CSV em 1 minuto — traga sua base e crie a 1ª OS hoje"
        action={<Button variant="outline" onClick={() => navigate('/app/clientes')}><ArrowLeft size={16} /> Voltar</Button>}
      />
      <div className="space-y-4">
        <Card>
          <h2 className="text-sm font-black text-neutral-800 dark:text-neutral-100">1 · Baixe o modelo</h2>
          <p className="mt-1 text-xs text-neutral-500">Excel e Google Planilhas abrem. Preencha e salve como CSV.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={downloadCsvExample}>
            <Download size={15} /> Baixar modelo CSV
          </Button>
        </Card>
        <Card>
          <h2 className="text-sm font-black text-neutral-800 dark:text-neutral-100">2 · Envie o arquivo</h2>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-6 py-8 text-center transition hover:border-primary-400 hover:bg-primary-50/50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-primary-950/20"
          >
            <Upload size={26} className="text-primary-600" />
            <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{fileName || 'Clique para escolher o CSV'}</span>
            <span className="text-xs text-neutral-400">Até 2000 linhas · vírgula ou ponto-e-vírgula</span>
          </button>
          <input ref={inputRef} type="file" accept=".csv,.txt" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </Card>
        {rows.length > 0 && (
          <Card>
            <h2 className="flex items-center gap-2 text-sm font-black text-neutral-800 dark:text-neutral-100">
              <CheckCircle2 size={16} className="text-emerald-500" /> 3 · Confira e importe ({rows.length})
            </h2>
            <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {rows.slice(0, 50).map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs dark:bg-neutral-900">
                  <span className="font-bold text-neutral-700 dark:text-neutral-200">{r.name}</span>
                  <span className="text-neutral-400">{[r.phone, r.city].filter(Boolean).join(' · ')}</span>
                </div>
              ))}
              {rows.length > 50 && <p className="text-xs text-neutral-400">+ {rows.length - 50} linhas…</p>}
            </div>
            {importing && <p className="mt-2 text-xs font-bold text-primary-600">Importando {done}/{rows.length}…</p>}
            <Button full className="mt-3" disabled={importing} onClick={handleImport}>
              {importing ? `Importando ${done}/${rows.length}…` : `Importar ${rows.length} cliente(s)`}
            </Button>
          </Card>
        )}
        {errors.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <h2 className="flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-200">
              <AlertTriangle size={16} /> Avisos ({errors.length})
            </h2>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-amber-700 dark:text-amber-300">
              {errors.slice(0, 30).map((e, i) => <li key={i}>· {e}</li>)}
              {errors.length > 30 && <li>· + {errors.length - 30} avisos…</li>}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
