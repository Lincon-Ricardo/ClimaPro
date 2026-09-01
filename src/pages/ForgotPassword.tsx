import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snowflake, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Loading';
import { supabase } from '../lib/supabaseClient';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Digite seu e-mail');
      return;
    }

    if (!email.includes('@')) {
      setError('E-mail inválido');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (err) {
        setError(err.message || 'Erro ao enviar e-mail de recuperação');
      } else {
        setSubmitted(true);
        toast('success', 'E-mail de recuperação enviado com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao resetar senha:', err);
      setError('Erro ao processar sua solicitação');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary-800 to-primary-900">
        <div className="flex items-center justify-center gap-2 pt-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Snowflake size={28} className="text-white" />
          </div>
          <div className="text-2xl font-extrabold text-white">ClimaPro</div>
        </div>
        <p className="mt-1 text-center text-sm text-primary-200">Gestão profissional para climatização</p>

        <div className="mx-auto mt-8 w-full max-w-md flex-1 px-4 pb-10">
          <div className="rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto">
              <Mail size={32} className="text-green-600" />
            </div>
            <h1 className="mt-4 text-center text-xl font-extrabold text-neutral-800">E-mail enviado!</h1>
            <p className="mt-2 text-center text-sm text-neutral-600">
              Verificamos sua conta. Você receberá um e-mail com instruções para redefinir sua senha em breve.
            </p>
            <p className="mt-4 text-center text-xs text-neutral-500">
              Verifique sua pasta de spam se não encontrar o e-mail.
            </p>

            <Button onClick={() => navigate('/login')} full size="lg" className="mt-6">
              Voltar ao login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary-800 to-primary-900">
      <div className="flex items-center justify-center gap-2 pt-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Snowflake size={28} className="text-white" />
        </div>
        <div className="text-2xl font-extrabold text-white">ClimaPro</div>
      </div>
      <p className="mt-1 text-center text-sm text-primary-200">Gestão profissional para climatização</p>

      <div className="mx-auto mt-8 w-full max-w-md flex-1 px-4 pb-10">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-xl">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-primary-600 hover:underline"
          >
            <ArrowLeft size={16} /> Voltar
          </button>

          <h1 className="text-xl font-extrabold text-neutral-800">Recuperar senha</h1>
          <p className="mt-1 text-sm text-neutral-500">Informe o e-mail associado à sua conta</p>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <Input
                label="E-mail"
                type="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" full size="lg" disabled={loading}>
              {loading ? <Spinner /> : <>Enviar e-mail de recuperação</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
