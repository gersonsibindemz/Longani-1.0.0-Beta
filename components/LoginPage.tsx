import React, { useState, useEffect } from 'react';
import { Loader } from './Loader';
import { longaniLogoUrl } from './Header';
import { useAuth } from '../contexts/AuthContext';
import { PasswordRecoveryModal } from './PasswordRecoveryModal';
import { EyeIcon, EyeOffIcon } from './Icons';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  useEffect(() => {
    const message = sessionStorage.getItem('signup_success');
    if (message) {
      setSuccessMessage(message);
      sessionStorage.removeItem('signup_success');
    }
  }, []);

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
            
            {successMessage && <p className="mb-4 text-center text-sm text-green-800 bg-green-100 p-3 rounded-lg border border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800/50">{successMessage}</p>}

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
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Palavra-passe
                  </label>
                  <div className="relative mt-1">
                      <input
                          id="password"
                          name="password"
                          type={isPasswordVisible ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#24a9c5] focus:border-[#24a9c5] sm:text-sm pr-10"
                      />
                      <button
                          type="button"
                          onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          aria-label={isPasswordVisible ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                      >
                          {isPasswordVisible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                      </button>
                  </div>
                </div>
              </div>
               <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            className="h-4 w-4 text-[#24a9c5] focus:ring-[#1e8a9f] border-gray-300 dark:border-gray-500 rounded"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                            Lembrar-me
                        </label>
                    </div>
                    <div className="text-sm">
                        <button
                            type="button"
                            onClick={() => setIsRecoveryModalOpen(true)}
                            className="font-medium text-[#24a9c5] hover:underline"
                        >
                            Esqueceu a sua palavra-passe?
                        </button>
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