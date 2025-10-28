import React, { useState } from 'react';
import { Loader } from './Loader';
import { longaniLogoUrl } from './Header';
import { useAuth } from '../contexts/AuthContext';
import { PasswordRecoveryModal } from './PasswordRecoveryModal';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      if (signInError.message === 'Invalid login credentials') {
        setError('Email ou palavra-passe inválidos.');
      } else {
        setError(signInError.message);
      }
      setIsLoading(false);
    } 
    // On success, the AuthContext listener will handle the redirect.
    // If sign-in is successful but email is not confirmed, the context handles the redirect to the confirmation page.
  };

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const targetUrl = new URL(event.currentTarget.href, window.location.origin);
    window.location.hash = targetUrl.hash;
  };

  return (
    <>
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto animate-fade-in-up">
          <img src={longaniLogoUrl} alt="Longani Logo" className="h-24 mx-auto mb-4 pointer-events-none" />
          <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-6">
              Bem-vindo de volta
              <span className="block text-xl font-normal text-gray-600 dark:text-gray-400 mt-1">Entrar</span>
            </h1>
            <form onSubmit={handleLogin} noValidate>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#24a9c5] focus:border-[#24a9c5] sm:text-sm"
                  />
                </div>
                <div>
                  <div className="flex justify-between">
                    <label htmlFor="password"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Palavra-passe
                    </label>
                     <button
                        type="button"
                        onClick={() => setIsRecoveryModalOpen(true)}
                        className="text-xs text-[#24a9c5] hover:underline"
                    >
                        Esqueceu a sua palavra-passe?
                    </button>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#24a9c5] focus:border-[#24a9c5] sm:text-sm"
                  />
                </div>
              </div>
              {error && <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#24a9c5] hover:bg-[#1e8a9f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] disabled:bg-gray-400 dark:focus:ring-offset-gray-900 transition-colors"
                >
                  {isLoading ? <Loader className="w-5 h-5" /> : 'Continuar'}
                </button>
              </div>
            </form>
            <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
              Ainda não tem conta? <a href="#/signup" onClick={handleNavClick} className="font-medium text-[#24a9c5] hover:underline">Cadastre-se</a>
            </p>
          </div>
        </div>
      </main>
      <PasswordRecoveryModal 
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
      />
    </>
  );
};