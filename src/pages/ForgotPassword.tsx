import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Loading';
import { supabase } from '../lib/supabaseClient';
import { AuthLayout } from '../components/AuthLayout';

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
    if (!email.trim()) { setError('Digite seu e-mail'); return; }
    if (!email.includes('@')) { setError('E-mail inválido'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) setError(err.message || 'Erro ao enviar e-mail de recuperação');
      else {
        setSubmitted(true);
        toast('success', 'E-mail de recuperação enviado!');
      }
    } catch {
      setError('Erro ao processar sua solicitação');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="E-mail enviado! 📬" subtitle="Verifique sua caixa de entrada e o spam.">
        <div className="cp-card rounded-[28px] p-6 text-center sm:p-7">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg">
            <MailCheck size={30} />
          </div>
          <p className="mt-4 text-sm font-medium text-neutral-600 dark:text-neutral-300">
            Enviamos as instruções para redefinir sua senha. O link vale por pouco tempo.
          </p>
          <Button onClick={() => navigate('/login')} full size="lg" className="mt-6">
            Voltar ao login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Recuperar senha" subtitle="Informe o e-mail da sua conta.">
      <form onSubmit={handleSubmit} className="cp-card rounded-[28px] p-6 sm:p-7">
        <button type="button" onClick={() => navigate('/login')} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-600 hover:underline dark:text-primary-300">
          <ArrowLeft size={16} /> Voltar
        </button>
        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div>
        )}
        <Input label="E-mail" type="email" placeholder="voce@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
        <Button type="submit" full size="lg" disabled={loading} className="mt-4">
          {loading ? <Spinner /> : <><Send size={17} /> Enviar link de recuperação</>}
        </Button>
      </form>
    </AuthLayout>
  );
}
