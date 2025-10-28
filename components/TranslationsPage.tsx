import React, { useState, useEffect, useCallback } from 'react';
import { getAllSavedTranslations, deleteTranslation } from '../utils/db';
import { Translation } from '../types';
import { Loader } from './Loader';
import { TranslateIcon, TrashIcon, ClipboardIcon, CheckIcon } from './Icons';
import { ConfirmationModal } from './ConfirmationModal';

export const TranslationsPage: React.FC = () => {
    const [translations, setTranslations] = useState<Translation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Translation | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getAllSavedTranslations();
            setTranslations(data);
        } catch (err) {
            setError('Não foi possível carregar as traduções.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await deleteTranslation(itemToDelete.id);
            setItemToDelete(null);
            fetchData();
        } catch (err) {
            console.error("Failed to delete translation", err);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleCopy = (item: Translation) => {
        const plainText = new DOMParser().parseFromString(item.translated_text, 'text/html').body.textContent || "";
        navigator.clipboard.writeText(plainText).then(() => {
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    if (isLoading) {
        return <div className="flex-grow flex items-center justify-center"><Loader className="w-8 h-8 text-[#24a9c5]" /></div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-600">{error}</div>;
    }
    
    return (
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Traduções Guardadas</h1>
            
            {translations.length === 0 ? (
                <div className="text-center py-16">
                    <TranslateIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto" />
                    <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">Nenhuma tradução guardada</h2>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">Pode traduzir as suas transcrições a partir da página "Minhas Transcrições".</p>
                </div>
            ) : (
                 <ul className="bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                    {translations.map(item => (
                        <li key={item.id} className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.original_filename} ({item.target_language.toUpperCase()})</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(item.created_at).toLocaleString('pt-PT')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleCopy(item)} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                                        {copiedId === item.id ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
                                    </button>
                                    <button onClick={() => setItemToDelete(item)} className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-500">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                             <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: item.translated_text }}></div>
                        </li>
                    ))}
                 </ul>
            )}

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDelete}
                title="Apagar Tradução"
                message={`Tem a certeza que deseja apagar permanentemente esta tradução? Esta ação não pode ser desfeita.`}
                isConfirming={isDeleting}
            />
        </main>
    );
};