import React, { useState } from 'react';
import { Loader } from './Loader';
import { longaniLogoUrl } from './Header';
import { useAuth } from '../contexts/AuthContext';

export const SignUpPage: React.FC = () => {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.');
      return;
    }

    if (!username.trim() || !email.trim() || !password.trim()) {
        setError('Por favor, preencha todos os campos.');
        return;
    }
    
    if (password.length < 6) {
        setError('A palavra-passe deve ter no mínimo 6 caracteres.');
        return;
    }

    if (!agreedToTerms) {
        setError('Deve aceitar os Termos de Serviço para criar uma conta.');
        return;
    }

    setIsLoading(true);

    const { error: signUpError } = await signUp(email, password, username);

    if (signUpError) {
        // Log the full error object for detailed debugging in the development console.
        console.error("Supabase sign-up error:", signUpError);

        if (signUpError.message.includes('User already registered')) {
            setError('Este email já está registado. Tente fazer login.');
        } else if (signUpError.message.includes('violates unique constraint') && signUpError.message.includes('device_id')) {
            setError('Este dispositivo já está associado a uma conta. Apenas uma conta por dispositivo é permitida.');
        } else if (signUpError.message.includes('Database error')) {
            // Provide a clearer message for the specific error the user is facing.
            setError('Ocorreu um erro ao criar o seu perfil. Por favor, tente novamente mais tarde ou contacte o suporte.');
        } else {
            setError(signUpError.message);
        }
        setIsLoading(false);
    } 
    // On success, the AuthProvider sets isAwaitingConfirmation and the app will redirect via the hook effect.
  };
  
  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const targetUrl = new URL(event.currentTarget.href, window.location.origin);
    window.location.hash = targetUrl.hash;
  };

  return (
    <main className="flex-grow flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto animate-fade-in-up">
        <img src={longaniLogoUrl} alt="Longani Logo" className="h-24 mx-auto mb-4 pointer-events-none" />
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-6">Criar a sua conta</h1>
          <form onSubmit={handleSignUp} noValidate>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome de Utilizador <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Ex.: Carla Jequecene)</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="name"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#24a9c5] focus:border-[#24a9c5] sm:text-sm"
                />
              </div>
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
                <label htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Palavra-passe <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(Mínimo de 6 caracteres)</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#24a9c5] focus:border-[#24a9c5] sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="confirm-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmar Palavra-passe
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#24a9c5] focus:border-[#24a9c5] sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="focus:ring-[#24a9c5] h-4 w-4 text-[#24a9c5] border-gray-300 dark:border-gray-600 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms" className="text-gray-600 dark:text-gray-400">
                      Eu aceito os <a href="#" onClick={(e) => e.preventDefault()} className="font-medium text-[#24a9c5] hover:underline">Termos de Serviço</a>.
                    </label>
                  </div>
                </div>
            </div>
            {error && <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-6">
              <button
                type="submit"
                disabled={isLoading || !agreedToTerms}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#24a9c5] hover:bg-[#1e8a9f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] disabled:bg-gray-400 dark:focus:ring-offset-gray-900 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader className="w-5 h-5" /> : 'Criar Conta'}
              </button>
            </div>
          </form>
          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Já tem conta? <a href="#/login" onClick={handleNavClick} className="font-medium text-[#24a9c5] hover:underline">Entrar</a>
          </p>
        </div>
      </div>
    </main>
  );
};