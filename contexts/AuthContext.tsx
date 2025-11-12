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
  signInWithGoogle: () => Promise<{ error: any }>;
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
    const { data: authListener } = supabase.auth.onAuthStateChange(
      // Fix: Refactored to async/await to handle promise chaining correctly and fix type error.
      async (event, newSession) => {
        setSession(newSession);
        const newAuthUser = newSession?.user ?? null;
        setUser(newAuthUser);
        
        if (newAuthUser) {
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newAuthUser.id)
              .single();

            if (profileError && profileError.code !== 'PGRST116') {
              throw profileError; 
            }

            if (profileData) {
              setProfile(profileData);
            } else {
              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: newAuthUser.id,
                  name: newAuthUser.user_metadata?.full_name ?? 'Novo Utilizador',
                  device_id: newAuthUser.user_metadata?.device_id,
                })
                .select()
                .single();
              if (insertError) {
                console.warn('Failed to auto-create profile:', insertError.message);
                setProfile(null);
              } else {
                setProfile(newProfile);
              }
            }
          } catch (error) {
            console.error("Error handling profile:", error);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
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
      let deviceId = localStorage.getItem('longani_deviceId');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('longani_deviceId', deviceId);
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: name,
            device_id: deviceId,
          },
        },
      });

      return { error };
    },

    signOut: async () => {
      await supabase.auth.signOut();
    },

    signInWithGoogle: async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // This option tells Supabase to return the URL instead of redirecting automatically.
          // It's crucial for environments that run the app in an iframe, as it prevents
          // Google's OAuth page from being blocked by X-Frame-Options headers.
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("Supabase OAuth error:", error);
        return { error };
      }
      
      if (data.url) {
        // Manually redirect the top-level window to break out of the iframe.
        window.top.location.href = data.url;
        // Return a promise that never resolves, as the page is navigating away.
        return new Promise(() => {});
      }
      
      return { error: new Error("Não foi possível obter o URL de autenticação do Google.") };
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
