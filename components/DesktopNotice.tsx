import React from 'react';
import { longaniLogoUrl } from './Header';

const DesktopNotice: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-6 text-center animate-fade-in">
            <div className="w-full max-w-lg mx-auto bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                <img src={longaniLogoUrl} alt="Longani Logo" className="h-20 mx-auto mb-6 pointer-events-none select-none" />
                
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    Otimizado para Dispositivos Móveis
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Para garantir a melhor experiência e desempenho, a aplicação Longani está disponível exclusivamente em smartphones e tablets.
                </p>

                <p className="text-xs text-gray-400 dark:text-gray-500 mt-8">
                    Agradecemos a sua compreensão e estamos empenhados em oferecer uma ferramenta poderosa no ambiente para o qual foi projetada.
                </p>
            </div>
             <footer className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm select-none mt-4">
                <p>
                    © {new Date().getFullYear()} Longani &middot; v.1.0.0 Beta
                </p>
            </footer>
        </div>
    );
};

export default DesktopNotice;