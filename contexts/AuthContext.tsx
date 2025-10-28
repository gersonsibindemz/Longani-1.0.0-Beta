import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import type { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAwaitingConfirmation: boolean;
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
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        const newAuthUser = newSession?.user ?? null;
        setUser(newAuthUser);

        if (newAuthUser) {
          // If profile is already loaded and user is the same, don't re-fetch
          if (profile?.id === newAuthUser.id) {
            return;
          }
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newAuthUser.id)
            .single();
          setProfile(profileData);
          setIsAwaitingConfirmation(false); // User is confirmed and logged in
          
          if (window.location.hash.startsWith('#/awaiting-confirmation')) {
            window.location.hash = '#/home';
          }
        } else {
          setProfile(null);
          // If we are logging out, don't stay on a protected page
          if (!window.location.hash.startsWith('#/login') && !window.location.hash.startsWith('#/signup')) {
            window.location.hash = '#/login';
          }
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [profile]);

  const value = {
    session,
    user,
    profile,
    loading,
    isAwaitingConfirmation,
    signIn: async (email: string, pass: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error?.message === 'Email not confirmed') {
        setIsAwaitingConfirmation(true);
        window.location.hash = '#/awaiting-confirmation';
        return { error: null }; // Prevent showing an error on the login page
      }
      return { error };
    },
    signUp: async (email: string, pass: string, name: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { name },
        },
      });
      if (!error && data.user) {
        setIsAwaitingConfirmation(true);
        window.location.hash = '#/awaiting-confirmation';
      }
      return { error };
    },
    signOut: async () => {
      await supabase.auth.signOut();
      // The onAuthStateChange listener will handle redirects and state clearing
    },
    updateProfile: async (updates: Partial<Profile>) => {
        if (!user) throw new Error("No user logged in");
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
        if (!user) throw new Error("No user logged in");

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage.from('profile_photos').upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('profile_photos').getPublicUrl(filePath);
        
        return data.publicUrl;
    },
    updateProfilePreferences: async (prefs: Partial<Profile['preferences']>) => {
        if (!user || !profile) return;
        const currentPrefs = (profile.preferences || {}) as Record<string, any>;
        // Cast `prefs` to a record type to resolve the spread operator error,
        // as the `Json` type from Supabase is too broad and can be a non-object.
        const updatedPreferences = { ...currentPrefs, ...(prefs as Record<string, any>) };
        await value.updateProfile({ preferences: updatedPreferences });
    },
    resetPasswordForEmail: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // URL to redirect to after password reset
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};