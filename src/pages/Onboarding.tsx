import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, UserRound, Building2, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Input } from '../components/Fields';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Loading';
import { useFormValidation } from '../hooks/useFormValidation';
import { registerSchema } from '../lib/schemas';
import { errMsg } from '../lib/errors';
import {
  recommendPlan, recommendPlanCopy, saveRecommendedPlan, getPlan,
  type QuizAnswers, type OsVolume, type TechSize, type MainGoal,
} from '../lib/plans';
import { formatBRL } from '../lib/utils';
import { AuthLayout } from '../components/AuthLayout';

const OS_OPTIONS: { value: OsVolume; label: string; hint: string }[] = [
  { value: 'ate30', label: 'Até 30 OS/mês', hint: 'Sou eu + ajudante' },
  { value: 'ate150', label: '31 a 150 OS/mês', hint: 'Equipe pequena' },
  { value: 'mais150', label: 'Mais de 150 OS/mês', hint: 'Operação grande' },
];

const TECH_OPTIONS: { value: TechSize; label: string; hint: string }[] = [
  { value: 'sozinho', label: 'Sozinho', hint: 'Só eu atendo' },
  { value: 'equipe25', label: '2 a 5 técnicos', hint: 'Equipe enxuta' },
  { value: 'mais5', label: 'Mais de 5', hint: 'Várias equipes' },
];

const GOAL_OPTIONS: { value: MainGoal; label: string; hint: string }[] = [
  { value: 'organizar', label: 'Organizar', hint: 'Agenda sem bagunça' },
  { value: 'receber', label: 'Receber rápido', hint: 'Cobrança no WhatsApp' },
  { value: 'lucro', label: 'Lucrar mais', hint: 'Saber quem dá lucro' },
];

export default function Onboarding() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasError, getError, validate, clearErrors } = useFormValidation(registerSchema);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [quiz, setQuiz] = useState<QuizAnswers>({ osVolume: 'ate30', techSize: 'sozinho', goal: 'organizar' });
  const [error, setError] = useState('');

  async function handleFinal() {
    setError('');
    clearErrors();
    if (!validate(form)) return;
    setCreating(true);
    try {
      const res = await register(form.name, form.email, form.password);
      if (res.ok) {
        const recommended = recommendPlan(quiz);
        saveRecommendedPlan(recommended);
        const { track } = await import('../lib/analytics');
        track('signup', { plan: recommended });
        track('quiz', { plan: recommended, osVolume: quiz.osVolume, techSize: quiz.techSize, goal: quiz.goal });
        toast('success', 'Conta criada! Seu plano ideal está pronto.');
        setStep(3);
      } else {
        setError(res.error || 'Erro ao criar conta. Tente novamente.');
      }
    } catch (e: unknown) {
      setError('Erro inesperado: ' + errMsg(e));
    }
    setCreating(false);
  }

  function OptionGrid<T extends string>({ options, value, onPick }: {
    options: { value: T; label: string; hint: string }[];
    value: T;
    onPick: (v: T) => void;
  }) {
    return (
      <div className="grid grid-cols-1 gap-2">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onPick(o.value)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 active:scale-[.99] ${
                active
                  ? 'border-primary-400 bg-gradient-to-r from-primary-50 to-sky-50 shadow-[0_10px_28px_-14px_rgba(11,61,145,.6)] ring-1 ring-primary-400/40 dark:border-sky-400 dark:from-sky-500/15 dark:to-blue-500/10 dark:ring-sky-400/30'
                  : 'border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:border-sky-400/50'
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${active ? 'border-primary-600 bg-primary-600 text-white dark:border-sky-300 dark:bg-sky-400 dark:text-[#071f4c]' : 'border-neutral-300 text-transparent dark:border-white/25'}`}>
                <Check size={13} strokeWidth={3.5} />
              </span>
              <span>
                <span className="block text-sm font-extrabold text-neutral-900 dark:text-white">{o.label}</span>
                <span className="block text-xs font-medium text-neutral-500 dark:text-neutral-300">{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (step === 3) {
    const recommended = recommendPlan(quiz);
    const plan = getPlan(recommended);
    return (
      <AuthLayout title="Seu plano ideal 🎯" subtitle={recommendPlanCopy(quiz)}>
        <div className="cp-card rounded-[28px] p-6 text-center sm:p-7">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-lg">
            <Check size={12} strokeWidth={3.5} /> Recomendado para você
          </span>
          <h2 className="font-display mt-3 text-3xl font-extrabold text-neutral-900 dark:text-white">{plan.name}</h2>
          <p className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-300">{plan.tagline}</p>
          <p className="font-display mt-3 text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {formatBRL(plan.price)}<span className="text-sm font-bold text-neutral-400">/mês</span>
          </p>
          <ul className="mx-auto mt-5 max-w-xs space-y-2 text-left text-[13px] font-medium text-neutral-700 dark:text-neutral-200">
            {plan.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500"><Check size={12} strokeWidth={3.5} /></span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-xs font-bold text-primary-800 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-100">
            Você começa com 14 dias grátis no Pro. Depois cai para o {plan.name} automaticamente.
          </p>
        </div>
        <div className="mt-4">
          <Button size="lg" full onClick={() => navigate('/app')}>
            Começar meu teste grátis <ArrowRight size={18} />
          </Button>
        </div>
        <button type="button" onClick={() => navigate('/app/planos')} className="mt-3 w-full py-1 text-center text-xs font-bold text-white/80 hover:text-white hover:underline">
          Ver todos os planos →
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={step === 1 ? 'Crie sua conta em 20s' : 'Qual o tamanho da sua operação?'}
      subtitle={step === 1 ? '14 dias grátis · sem cartão · cancele quando quiser.' : 'Para oferecer o melhor plano e não pagar a mais.'}
    >
      <button
        type="button"
        onClick={() => (step === 2 ? setStep(1) : navigate('/login'))}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-[.98]"
      >
        <ArrowLeft size={14} /> {step === 2 ? 'Voltar' : 'Voltar ao login'}
      </button>
      <div className="mb-4 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? 'bg-gradient-to-r from-sky-400 to-cyan-300' : 'bg-white/20'}`} />
        ))}
        <span className="ml-1 text-[11px] font-bold text-white/70">Passo {step}/2</span>
      </div>

      {step === 1 ? (
        <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="cp-card rounded-[28px] p-6 sm:p-7">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-700 to-sky-500 text-white">
              <UserRound size={17} />
            </span>
            <h2 className="font-display text-lg font-extrabold text-neutral-900 dark:text-white">Seus dados</h2>
          </div>
          {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div>}
          <div className="mt-5 space-y-4">
            <div>
              <Input label="Seu nome" placeholder="Ex.: Carlos Técnico" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {hasError('name') && <p className="mt-1 text-[13px] font-medium text-red-600 dark:text-red-300">{getError('name')}</p>}
            </div>
            <div>
              <Input label="E-mail" type="email" placeholder="voce@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {hasError('email') && <p className="mt-1 text-[13px] font-medium text-red-600 dark:text-red-300">{getError('email')}</p>}
            </div>
            <div>
              <Input label="Senha" type="password" placeholder="Crie uma senha forte" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              {hasError('password') && <p className="mt-1 text-[13px] font-medium text-red-600 dark:text-red-300">{getError('password')}</p>}
            </div>
          </div>
          <Button type="submit" size="lg" full className="mt-5">
            Continuar <ArrowRight size={18} />
          </Button>
        </form>
      ) : (
        <div className="cp-card rounded-[28px] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 text-white">
              <Building2 size={17} />
            </span>
            <h2 className="font-display text-lg font-extrabold text-neutral-900 dark:text-white">Seu perfil</h2>
          </div>
          <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[11px] text-white">1</span> Quantas OS por mês?
          </p>
          <OptionGrid options={OS_OPTIONS} value={quiz.osVolume} onPick={(v: OsVolume) => setQuiz({ ...quiz, osVolume: v })} />
          <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[11px] text-white">2</span> Quantos técnicos?
          </p>
          <OptionGrid options={TECH_OPTIONS} value={quiz.techSize} onPick={(v: TechSize) => setQuiz({ ...quiz, techSize: v })} />
          <p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[11px] text-white">3</span> Objetivo principal?
          </p>
          <OptionGrid options={GOAL_OPTIONS} value={quiz.goal} onPick={(v: MainGoal) => setQuiz({ ...quiz, goal: v })} />
          <div className="mt-5 flex gap-2">
            <Button variant="outline" size="lg" onClick={() => setStep(1)}>
              <ArrowLeft size={18} />
            </Button>
            <Button size="lg" full disabled={creating} onClick={handleFinal}>
              {creating ? <Spinner /> : <><Target size={17} /> Criar conta e ver meu plano</>}
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
