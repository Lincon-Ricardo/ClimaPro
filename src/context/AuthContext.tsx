import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { User } from '../types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  seedReady: boolean;
  online: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;
}

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    (async () => {
      const configured = await isSupabaseConfigured();
      if (!configured) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.user) {
        const u = await fetchProfile(session.user.id);
        if (u) setUser(u);
      }
      setLoading(false);

      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (s?.user) {
          fetchProfile(s.user.id).then((u) => u && setUser(u));
        } else {
          setUser(null);
        }
      });
      return () => sub.subscription.unsubscribe();
    })();
  }, []);

  async function fetchProfile(id: string): Promise<User | null> {
    // O perfil é criado por um trigger após o signup; às vezes demora alguns ms.
    const MAX_ATTEMPTS = 8;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (data) {
          console.log(`[Auth] Perfil encontrado na tentativa ${attempt + 1}`);
          return {
            id: data.id,
            name: data.name || 'Dono',
            firstName: data.first_name || data.name?.split(' ')[0] || 'Dono',
            email: '',
            role: data.role,
            companyName: '',
          };
        }
      } catch (err) {
        console.warn(`[Auth] Erro ao buscar perfil (tentativa ${attempt + 1}):`, err);
      }
      if (attempt < MAX_ATTEMPTS - 1) {
        const delay = Math.min(500 * Math.pow(1.5, attempt), 5000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    console.warn(`[Auth] Perfil não encontrado após ${MAX_ATTEMPTS} tentativas`);
    return null;
  }

  const login = async (email: string, password: string) => {
    const configured = await isSupabaseConfigured();
    if (!configured) return { ok: false, error: 'Backend não configurado.' };
    const { error, data } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) {
      return { ok: false, error: error?.message || 'E-mail ou senha inválidos.' };
    }

    const u = await fetchProfile(data.user.id);
    if (u) {
      setUser(u);
    } else {
      // Fallback: se o perfil não for encontrado, ainda assim loga com os dados da sessão.
      console.warn('[Auth] Perfil não encontrado, usando fallback com dados da sessão');
      const fn = data.user.user_metadata?.['name']?.split(' ')[0] || 'Dono';
      setUser({
        id: data.user.id,
        name: data.user.user_metadata?.['name'] || 'Dono',
        firstName: fn,
        email: data.user.email || '',
        role: 'admin',
        companyName: '',
      });
    }
    return { ok: true };
  };

  const register = async (name: string, email: string, password: string) => {
    const configured = await isSupabaseConfigured();
    if (!configured) return { ok: false, error: 'Backend não configurado.' };
    let data: any;
    let error: any;
    try {
      const res = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { name } },
      });
      data = res.data;
      error = res.error;
    } catch (e: any) {
      console.error('signUp lançou exceção:', e);
      return { ok: false, error: 'Falha na comunicação: ' + (e?.message || String(e)) };
    }
    if (error) {
      console.error('signUp error:', error);
      return { ok: false, error: error.message || 'Não foi possível criar a conta.' };
    }
    if (!data?.user) return { ok: false, error: 'Não foi possível criar a conta.' };

    // Se não veio sessão, o Supabase exige confirmação de e-mail.
    if (!data.session) {
      return { ok: false, needsConfirmation: true, error: 'Enviamos um link de confirmação para o seu e-mail. Verifique sua caixa de entrada.' };
    }

    // Loga imediatamente com os dados que já temos, sem depender do perfil (evita o "piscar").
    const fn = name.trim().split(' ')[0] || 'Dono';
    const newUser: User = {
      id: data.user.id,
      name: name.trim(),
      firstName: fn,
      email: data.user.email || '',
      role: 'admin',
      companyName: '',
    };
    setUser(newUser);
    console.log('[Auth] Usuário registrado com sucesso, buscando perfil...');
    // Busca perfil em background sem bloquear navegação
    fetchProfile(data.user.id).then((u) => {
      if (u) {
        console.log('[Auth] Perfil encontrado após registro, atualizando');
        setUser(u);
      }
    });
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, seedReady: !loading, online, login, logout, register }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
