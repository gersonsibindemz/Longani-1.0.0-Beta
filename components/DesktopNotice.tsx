import React from 'react';
import { longaniLogoUrl } from './Header';
import { SmartphoneIcon, TabletIcon } from './Icons';

const DesktopNotice: React.FC = () => {
    const currentUrl = window.location.href;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentUrl)}&bgcolor=f3f4f6`;
    const qrCodeUrlDark = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentUrl)}&bgcolor=1f2937`;

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

                <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                    <div className="text-gray-700 dark:text-gray-300">
                         <div className="flex items-center justify-center gap-6 text-gray-400 dark:text-gray-500 mb-4">
                            <SmartphoneIcon className="w-10 h-10" />
                            <TabletIcon className="w-12 h-12" />
                        </div>
                        <p className="font-semibold">Aceda a partir do seu telemóvel</p>
                        <p className="text-sm">Use a câmara do seu telemóvel para ler o código QR e abrir esta página instantaneamente.</p>
                    </div>
                    <div className="flex-shrink-0 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <img src={qrCodeUrl} alt="QR Code to open on mobile" className="block dark:hidden w-32 h-32" />
                        <img src={qrCodeUrlDark} alt="QR Code to open on mobile" className="hidden dark:block w-32 h-32" />
                    </div>
                </div>

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
