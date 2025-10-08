import React, { useState } from 'react';
import { Loader } from './Loader';
import { CloseIcon } from './Icons';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string) => Promise<void>;
  isInviting: boolean;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, onInvite, isInviting }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Por favor, preencha o campo de email.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        setError('Por favor, insira um endereço de email válido.');
        return;
    }

    await onInvite(email);
  };
  
  const handleClose = () => {
      if (isInviting) return;
      setEmail('');
      setError(null);
      onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 transform transition-all animate-zoom-in">
        <button
          onClick={handleClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          disabled={isInviting}
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        <form onSubmit={handleSubmit}>
          <h2 id="invite-modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Convidar Novo Membro</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="member-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email do Membro
              </label>
              <input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="exemplo@dominio.com"
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#24a9c5] focus:border-[#24a9c5] sm:text-sm"
              />
            </div>
          </div>
          
          {error && <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="mt-8 flex flex-col-reverse sm:flex-row sm:gap-3 gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isInviting}
              className="w-full inline-flex justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isInviting}
              className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-[#24a9c5] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1e8a9f] disabled:bg-cyan-400 dark:disabled:bg-cyan-800 disabled:cursor-not-allowed"
            >
              {isInviting ? (
                  <>
                    <Loader className="w-4 h-4" />
                    <span>A Convidar...</span>
                  </>
              ) : (
                'Enviar Convite'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};