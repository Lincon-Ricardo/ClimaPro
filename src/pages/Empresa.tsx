import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input, Textarea } from '../components/Fields';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { Loading } from '../components/Loading';
import { errMsg } from '../lib/errors';
import { Eraser, Upload, PenLine } from 'lucide-react';

const emptyForm = {
  name: '', cnpj: '', phone: '', whatsapp: '', email: '',
  address: '', instagram: '', site: '', pix: '', logo: '', signature: '',
  paymentCondition: '', executionTerm: '', warranty: '', defaultValidity: '',
  commissionEnabled: true, commissionRate: 15,
};

export default function Empresa() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const companiesRaw = useLiveQuery(() => db.companies.toArray(), []);
  const lightCompany = (companiesRaw || [])[0];
  const fullCompany = useLiveQuery(
    () => (lightCompany?.id ? db.companies.get(lightCompany.id) : Promise.resolve(undefined)),
    [lightCompany?.id],
    'companies',
  );
  const companies = fullCompany ? [fullCompany] : companiesRaw || [];
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (companiesRaw !== undefined) setLoaded(true);
  }, [companiesRaw]);
  const company = companies[0];
  const sigRef = useRef<SignatureCanvas>(null);
  const [sigMode, setSigMode] = useState<'draw' | 'upload' | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm);

  // Cria automaticamente o registro da empresa se ele ainda não existir.
  useEffect(() => {
    (async () => {
      if (!ready) return;
      try {
        if (!company) {
          const id = crypto.randomUUID();
          await db.companies.add({ ...emptyForm, id, name: user?.name || 'Minha empresa' });
          toast('info', 'Perfil de empresa criado. Preencha os dados e salve.');
          return;
        }
         
      } catch {
        // empresa será criada no salvamento manual
      }
    })();
  }, [ready, company, user]);

  useEffect(() => {
    if (loaded) setReady(true);
  }, [loaded]);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || '',
        cnpj: company.cnpj || '',
        phone: company.phone || '',
        whatsapp: company.whatsapp || '',
        email: company.email || '',
        address: company.address || '',
        instagram: company.instagram || '',
        site: company.site || '',
        pix: company.pix || '',
        logo: company.logo || '',
        signature: company.signature || '',
        paymentCondition: company.paymentCondition || '',
        executionTerm: company.executionTerm || '',
        warranty: company.warranty || '',
        defaultValidity: company.defaultValidity || '',
        commissionEnabled: company.commissionEnabled !== false,
        commissionRate: company.commissionRate !== undefined && company.commissionRate !== null ? Number(company.commissionRate) : 15,
      });
    }
  }, [company]);

  if (!ready) return <Loading />;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (company) {
        await db.companies.update(company.id, { ...form });
      } else {
        await db.companies.add({ ...emptyForm, id: crypto.randomUUID(), ...form });
      }
      toast('success', 'Perfil atualizado!');
      navigate('/app/perfil');
    } catch (err: unknown) {
      toast('error', `Erro ao salvar: ${errMsg(err)}`);
    } finally {
      setSaving(false);
    }
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast('error', 'A logo deve ter no máximo 512KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo: String(reader.result || '') }));
    reader.readAsDataURL(file);
  }

  function onSigUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast('error', 'A assinatura deve ter no máximo 512KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, signature: String(reader.result || '') }));
      setSigMode(null);
    };
    reader.readAsDataURL(file);
  }

  function saveDrawnSignature() {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast('error', 'Desenhe a assinatura antes de salvar.');
      return;
    }
    const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
    setForm((f) => ({ ...f, signature: dataUrl }));
    setSigMode(null);
    toast('success', 'Assinatura salva!');
  }

  function clearSignature() {
    setForm((f) => ({ ...f, signature: '' }));
    sigRef.current?.clear();
    setSigMode(null);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl">
      <PageHeader title="Editar perfil da empresa" subtitle="Essas informações aparecem nos orçamentos e documentos" />
      <form onSubmit={handleSave} className="space-y-5 rounded-2xl bg-white p-5 shadow-card dark:bg-neutral-800">
        {/* Logo */}
        <div className="flex items-center gap-4">
          {form.logo ? (
            <img src={form.logo} alt="Logo" className="h-16 w-16 rounded-xl object-contain bg-neutral-100 dark:bg-neutral-700" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-neutral-700">
              Logo
            </div>
          )}
          <div className="space-y-2">
            <label className="inline-block cursor-pointer rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 dark:border-neutral-600 dark:text-neutral-200">
              Enviar logo
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onLogoChange} />
            </label>
            {form.logo && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, logo: '' }))} className="block text-sm text-danger">
                Remover logo
              </button>
            )}
          </div>
        </div>

        {/* Dados */}
        <Input label="Nome da empresa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="CNPJ/CPF" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <Textarea label="Endereço" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
          <Input label="Site" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} />
        </div>
        <Input label="Chave PIX" value={form.pix} onChange={(e) => setForm({ ...form, pix: e.target.value })} />

        {/* ── Condições comerciais ── */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
          <p className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Condições comerciais</p>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
            Essas condições aparecem automaticamente nos PDFs de orçamento.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Input
              label="Forma de pagamento"
              value={form.paymentCondition}
              onChange={(e) => setForm({ ...form, paymentCondition: e.target.value })}
              placeholder="Ex.: PIX, dinheiro ou cartão"
            />
            <Input
              label="Prazo de execução"
              value={form.executionTerm}
              onChange={(e) => setForm({ ...form, executionTerm: e.target.value })}
              placeholder="Ex.: em até 2 dias úteis após aprovação"
            />
            <Input
              label="Garantia"
              value={form.warranty}
              onChange={(e) => setForm({ ...form, warranty: e.target.value })}
              placeholder="Ex.: 90 dias para mão de obra"
            />
            <Input
              label="Validade padrão"
              value={form.defaultValidity}
              onChange={(e) => setForm({ ...form, defaultValidity: e.target.value })}
              placeholder="Ex.: 7 dias"
            />
          </div>
        </div>

        {/* ── Comissão da equipe ── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Comissão da equipe técnica</p>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
            Defina se os técnicos recebem comissão e qual % sobre cada serviço concluído. Eles veem o extrato em "Meu Desempenho".
          </p>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5 dark:bg-neutral-800">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Técnicos recebem comissão?
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!!form.commissionEnabled}
              onClick={() => setForm((f) => ({ ...f, commissionEnabled: !f.commissionEnabled }))}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${form.commissionEnabled ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.commissionEnabled ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
          </label>
          {form.commissionEnabled && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Porcentagem padrão da comissão
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={form.commissionRate}
                  onChange={(e) => setForm((f) => ({ ...f, commissionRate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                  className="w-24 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-amber-500 dark:border-neutral-600 dark:bg-neutral-800"
                />
                <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">%</span>
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {[10, 15, 20, 30].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, commissionRate: v }))}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${form.commissionRate === v ? 'bg-amber-500 text-white' : 'bg-white text-neutral-500 hover:bg-amber-100 dark:bg-neutral-800 dark:hover:bg-amber-900/40'}`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Assinatura ── */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
          <p className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            Assinatura do responsável
          </p>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
            Essa assinatura aparece nos PDFs de orçamento e ordem de serviço.
          </p>

          {form.signature && sigMode !== 'draw' && sigMode !== 'upload' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white p-3 dark:border-neutral-600 dark:bg-neutral-800">
                <img src={form.signature} alt="Assinatura" className="max-h-20 object-contain" />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSigMode('draw')}>
                  <PenLine size={14} /> Assinar manualmente
                </Button>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  <Upload size={14} /> Enviar imagem
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onSigUpload} />
                </label>
                <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                  <Eraser size={14} /> Remover
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={sigMode === 'draw' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setSigMode('draw')}
                >
                  <PenLine size={14} /> Assinar manualmente
                </Button>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-700">
                  <Upload size={14} /> Enviar imagem
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onSigUpload} />
                </label>
                {form.signature && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setSigMode(null)}>
                    Cancelar
                  </Button>
                )}
              </div>

              {sigMode === 'draw' && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-800">
                    <SignatureCanvas
                      ref={sigRef}
                      canvasProps={{ className: 'w-full h-24 rounded-lg cursor-crosshair' }}
                      backgroundColor="rgb(255,255,255)"
                      penColor="#1e293b"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => sigRef.current?.clear()}>
                      <Eraser size={14} /> Limpar
                    </Button>
                    <Button type="button" size="sm" onClick={saveDrawnSignature}>
                      Salvar assinatura
                    </Button>
                  </div>
                </div>
              )}

              {!sigMode && (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white text-neutral-400 dark:border-neutral-600 dark:bg-neutral-800">
                  Nenhuma assinatura configurada
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" full disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </div>
  );
}
