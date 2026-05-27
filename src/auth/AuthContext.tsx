import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  openLoginModal: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
  openLoginModal: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
