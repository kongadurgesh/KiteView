import { useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { AuthContext } from './AuthContext';
import { LoginModal } from './LoginModal';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const openLoginModal = useCallback(() => setLoginModalOpen(true), []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, openLoginModal }}>
      {children}
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </AuthContext.Provider>
  );
}
