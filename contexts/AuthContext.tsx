import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import type { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: any }>;
  signUp: (email: string, pass: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<string | null>;
  updateProfilePreferences: (prefs: Partial<Profile['preferences']>) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: any }>;
  updateUserEmail: (newEmail: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSessionAndProfile = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data.session ?? null;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
          // PGRST116 means no rows found, which is not a critical error on initial load.
          // The auth listener will handle profile creation if needed.
          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching initial profile:', error);
          }
          setProfile(profileData ?? null);
        }
      } catch (e) {
        console.error('An unexpected error occurred during initial session check:', e);
      } finally {
        // This ensures the loading spinner is always removed, fixing the infinite load on refresh.
        setLoading(false);
      }
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        const newAuthUser = newSession?.user ?? null;
        setUser(newAuthUser);

        if (newAuthUser) {
          const { data: profileData, error: selectError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newAuthUser.id)
            .single();

          if (!profileData) {
            try {
              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: newAuthUser.id,
                  name: newAuthUser.user_metadata?.full_name ?? 'Novo Utilizador',
                })
                .select()
                .single();

              if (insertError) {
                console.warn('Could not insert profile via client (may already exist or RLS blocking):', insertError);
              } else {
                setProfile(newProfile as Profile);
              }
            } catch (e) {
              console.warn('Error inserting profile (caught):', e);
            }
          } else {
            setProfile(profileData as Profile);
          }

          if (window.location.hash.startsWith('#/awaiting-confirmation')) {
            window.location.hash = '#/home';
          }
        } else {
          setProfile(null);
          // Only redirect if the user explicitly signed out.
          // This prevents redirection on initial page load before the session is restored.
          if (event === 'SIGNED_OUT') {
            window.location.hash = '#/login';
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextType = {
    session,
    user,
    profile,
    loading,

    signIn: async (email: string, pass: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      return { error };
    },

    signUp: async (email: string, pass: string, name: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { full_name: name } },
      });

      if (!error && data.user) {
        window.location.hash = '#/login';
      }

      return { error };
    },

    signOut: async () => {
      await supabase.auth.signOut();
    },

    updateProfile: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('Nenhum utilizador autenticado');
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
    },

    uploadProfilePhoto: async (file: File) => {
      if (!user) throw new Error('Nenhum utilizador autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('profile_photos').getPublicUrl(filePath);
      return data.publicUrl;
    },

    updateProfilePreferences: async (prefs: Partial<Profile['preferences']>) => {
      if (!user || !profile) return;
      const currentPrefs = (profile.preferences || {}) as Record<string, any>;
      const updatedPreferences = { ...currentPrefs, ...(prefs as Record<string, any>) };
      await value.updateProfile({ preferences: updatedPreferences });
    },

    resetPasswordForEmail: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      return { error };
    },

    updateUserEmail: async (newEmail: string) => {
      if (!user) return { error: { message: 'Nenhum utilizador autenticado.' } };
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      return { error };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};