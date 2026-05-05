import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'superadmin' | 'admin' | 'backoffice' | 'analyst' | 'teamleiter' | 'controlling' | 'geschaeftsleitung' | 'hr' | 'agency_manager';

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  updateEmail: (newEmail: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  isSuperadmin: boolean;
  isTeamleiter: boolean;
  isControlling: boolean;
  isGeschaeftsleitung: boolean;
  isHR: boolean;
  isAgencyManager: boolean;
  isBackoffice: boolean;
  isAgencyScoped: boolean;
  isReviewRole: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_roles').select('role').eq('user_id', userId).single(),
    ]);
    setProfile(profileRes.data as Profile | null);
    setRole((roleRes.data?.role as AppRole) ?? null);
  };


  // Auto-logout after 45 minutes of inactivity (skip if "Angemeldet bleiben" is active)
  useEffect(() => {
    const rememberMe = localStorage.getItem('ssm_remember_me') === 'true';
    if (rememberMe) return; // Skip auto-logout when user chose to stay logged in

    const INACTIVITY_TIMEOUT = 45 * 60 * 1000; // 45 minutes
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setProfile(null);
          setRole(null);
          window.location.href = '/login';
        }
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, []);

  useEffect(() => {
    // 1. Restore session from storage first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session && isPreviewBypassEnabled()) {
        applyPreviewBypass();
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserData(session.user.id);
      }
      setLoading(false);
    });

    // 2. Listen for subsequent auth changes (sign in/out) — no await inside!
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && isPreviewBypassEnabled()) {
        applyPreviewBypass();
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const hostname = window.location.hostname;
      const isPreview =
        hostname.includes('lovableproject.com') ||
        hostname.includes('lovable.app') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1';

      // In Preview/Dev: skip SSO proxy and sign in directly against Supabase
      if (isPreview) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
      }

      // Production: verify via SSO proxy first
      const ssoRes = await supabase.functions.invoke('sso-proxy', {
        body: { email, password },
      });
      const ssoData = ssoRes.data;
      if (ssoRes.error || ssoData?.error) {
        return { error: new Error(ssoData?.error || ssoRes.error?.message || 'SSO-Fehler') };
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || 'Authentifizierung fehlgeschlagen') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (isPreviewBypassEnabled()) {
      applyPreviewBypass();
      return;
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
    return { error };
  };

  const updateEmail = async (newEmail: string) => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, role, loading,
      isSuperadmin: role === 'superadmin',
      isTeamleiter: role === 'teamleiter',
      isControlling: role === 'controlling',
      isGeschaeftsleitung: role === 'geschaeftsleitung',
      isHR: role === 'hr',
      isAgencyManager: role === 'agency_manager',
      isBackoffice: role === 'backoffice',
      isAgencyScoped: role === 'agency_manager' || role === 'backoffice',
      isReviewRole: role === 'controlling' || role === 'geschaeftsleitung' || role === 'hr',
      signUp, signIn, signOut,
      updateProfile, updateEmail, updatePassword, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
