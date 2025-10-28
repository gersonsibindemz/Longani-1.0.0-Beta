import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from './Loader';
import { CloseIcon } from './Icons';

interface PasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PasswordRecoveryModal: React.FC<PasswordRecoveryModalProps> = ({ isOpen, onClose }) => {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    const { error: resetError } = await resetPasswordForEmail(email);

    if (resetError) {
      setError('Não foi possível enviar o email de recuperação. Por favor, tente novamente.');
      console.error(resetError);
    } else {
      setMessage('Se existir uma conta com este email, enviámos um link de recuperação. Por favor, verifique a sua caixa de entrada e a pasta de spam.');
    }
    setIsLoading(false);
  };
  
  const handleClose = () => {
      if (isLoading) return;
      // Reset state on close
      setEmail('');
      setMessage('');
      setError('');
      onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 transform transition-all animate-zoom-in">
        <button
          onClick={handleClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        <h2 id="recovery-modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Recuperar Palavra-passe</h2>
        
        {message ? (
            <div className="text-center">
                <p className="text-gray-600 dark:text-gray-300">{message}</p>
                <button onClick={handleClose} className="mt-6 w-full inline-flex justify-center rounded-md bg-[#24a9c5] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1e8a9f]">
                    Fechar
                </button>
            </div>
        ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Insira o seu endereço de email e enviaremos um link para redefinir a sua palavra-passe.
              </p>
              <div>
                <label htmlFor="recovery-email" className="sr-only">Email</label>
                <input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="O seu endereço de email"
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#24a9c5] focus:border-[#24a9c5] sm:text-sm"
                />
              </div>

              {error && <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:gap-3 gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-[#24a9c5] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1e8a9f] disabled:opacity-50"
                >
                  {isLoading ? <Loader className="w-5 h-5" /> : 'Enviar Link de Recuperação'}
                </button>
              </div>
            </form>
        )}
      </div>
    </div>
  );
};