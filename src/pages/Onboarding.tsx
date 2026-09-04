import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snowflake, CalendarDays, Wallet, Users, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Loading';
import { useFormValidation } from '../hooks/useFormValidation';
import { registerSchema } from '../lib/schemas';

const slides = [
  { icon: Wallet, title: 'Organize seus serviços em um só lugar', text: 'Clientes, serviços e orçamentos sem papel e sem planilhas.' },
  { icon: CalendarDays, title: 'Controle sua agenda', text: 'Agende atendimentos e veja seu dia em segundos.' },
  { icon: Check, title: 'Crie e envie orçamentos profissionais', text: 'Gere PDF e compartilhe pelo WhatsApp em um toque.' },
  { icon: Users, title: 'Todo o histórico dos seus clientes', text: 'Equipamentos, manutenções e valores em um único lugar.' },
];

export default function Onboarding() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasError, getError, validate, clearErrors } = useFormValidation(registerSchema);
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const last = step === slides.length - 1;

  async function handleFinal() {
    setError('');
    clearErrors();

    if (!validate(form)) {
      return;
    }

    setCreating(true);
    try {
      const res = await register(form.name, form.email, form.password);
      if (res.ok) {
        toast('success', 'Conta criada! Vamos começar.');
        navigate('/app');
      } else {
        setError(res.error || 'Erro ao criar conta. Tente novamente.');
      }
    } catch (e: any) {
      setError('Erro inesperado: ' + (e?.message || String(e)));
    }
    setCreating(false);
  }
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary-800 to-primary-900">
      <div className="flex items-center justify-center gap-2 pt-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
          <Snowflake size={24} className="text-white" />
        </div>
        <div className="text-xl font-extrabold text-white">ClimaPro</div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        <div className="flex-1">
          {step < slides.length - 1 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              {(() => {
                const S = slides[step];
                return (
                  <>
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10">
                      <S.icon size={48} className="text-white" />
                    </div>
                    <h1 className="mt-6 text-2xl font-extrabold text-white">{S.title}</h1>
                    <p className="mt-2 max-w-xs text-primary-100">{S.text}</p>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="mt-2">
              <h1 className="text-2xl font-extrabold text-white">Vamos começar?</h1>
              <p className="mt-1 text-primary-100">Crie seu perfil para iniciar.</p>
              {error && <div className="mt-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-100">{error}</div>}
              <div className="mt-5 space-y-3 rounded-2xl bg-white p-5 dark:bg-neutral-800">
                <div>
                  <Input
                    label="Seu nome"
                    placeholder="Ex.: Carlos Técnico"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  {hasError('name') && <p className="mt-1 text-sm text-red-600">{getError('name')}</p>}
                </div>
                <div>
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="voce@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  {hasError('email') && <p className="mt-1 text-sm text-red-600">{getError('email')}</p>}
                </div>
                <div>
                  <Input
                    label="Senha"
                    type="password"
                    placeholder="Crie uma senha"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  {hasError('password') && <p className="mt-1 text-sm text-red-600">{getError('password')}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-white' : 'w-2 bg-white/30'}`} />
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          {step > 0 && (
            <Button variant="ghost" size="lg" className="text-white hover:bg-white/10" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={18} /> Voltar
            </Button>
          )}
          {!last ? (
            <Button variant="light" size="lg" full onClick={() => setStep(step + 1)}>
              Próximo <ArrowRight size={18} />
            </Button>
          ) : (
            <Button variant="light" size="lg" full disabled={creating} onClick={handleFinal}>
              {creating ? <Spinner /> : <>Criar meu perfil <ArrowRight size={18} /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
