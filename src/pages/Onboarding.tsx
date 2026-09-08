import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snowflake, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Loading';
import { useFormValidation } from '../hooks/useFormValidation';
import { registerSchema } from '../lib/schemas';

export default function Onboarding() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasError, getError, validate, clearErrors } = useFormValidation(registerSchema);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

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
        const { track } = await import('../lib/analytics');
        track('signup');
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
          <div className="mt-2">
            <h1 className="text-2xl font-extrabold text-white">Crie sua conta em 20s</h1>
            <p className="mt-1 text-primary-100">14 dias grátis · sem cartão · cancele quando quiser.</p>
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
        </div>

        <div className="mt-5 flex gap-3">
          <Button variant="light" size="lg" full disabled={creating} onClick={handleFinal}>
            {creating ? <Spinner /> : <>Criar conta grátis <ArrowRight size={18} /></>}
          </Button>
        </div>
        <button type="button" onClick={() => navigate('/app/servicos/novo')} className="mt-3 w-full py-1 text-center text-xs text-primary-100 hover:underline">
          Depois: criar minha 1ª OS em 1 toque →
        </button>
      </div>
    </div>
  );
}
