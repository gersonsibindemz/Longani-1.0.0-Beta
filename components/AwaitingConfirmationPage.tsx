import React from 'react';
import { longaniLogoUrl } from './Header';

export const AwaitingConfirmationPage: React.FC = () => {

    const handleRefresh = () => {
        // Simple reload, the AuthContext will handle redirection if the user is confirmed.
        window.location.reload();
    }

    return (
        <main className="flex-grow flex items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto animate-fade-in-up text-center">
                <img src={longaniLogoUrl} alt="Longani Logo" className="h-24 mx-auto mb-6 pointer-events-none" />
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                        Confirme o seu Email
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Enviámos um link de confirmação para o seu endereço de email. Por favor, clique no link para ativar a sua conta.
                    </p>
                    <button
                        onClick={handleRefresh}
                        className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#24a9c5] hover:bg-[#1e8a9f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] dark:focus:ring-offset-gray-900 transition-colors"
                    >
                        Já confirmei, quero continuar
                    </button>
                    <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
                        <p className="mb-2">Não recebeu o email? Verifique a sua pasta de spam ou tente <a href="#/signup" className="font-medium text-[#24a9c5] hover:underline">inscrever-se novamente</a>.</p>
                        <p>Abrir a sua aplicação de email:</p>
                        <div className="flex justify-center gap-4 mt-2">
                             <a href="mailto:" className="font-medium text-[#24a9c5] hover:underline">Padrão</a>
                            <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="font-medium text-[#24a9c5] hover:underline">Gmail</a>
                            <a href="https://outlook.live.com" target="_blank" rel="noopener noreferrer" className="font-medium text-[#24a9c5] hover:underline">Outlook</a>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};
