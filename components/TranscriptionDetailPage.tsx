import React, { useState, useEffect, useCallback } from 'react';
import { Transcription, Translation } from '../types';
import { getTranscriptionById, getTranslationsByTranscriptionId, updateTranscription, deleteTranscription } from '../utils/db';
import { Loader } from './Loader';
import { ArrowLeftIcon, ClockIcon, TranslateIcon, EditIcon, StarIcon, StarOutlineIcon, TrashIcon, UsersIcon } from './Icons';
import { TranscriptDisplay } from './TranscriptDisplay';
import { ConfirmationModal } from './ConfirmationModal';
import { useAuth } from '../contexts/AuthContext';
import { translateLanguageName } from '../utils/audioUtils';

type Tab = 'raw' | 'cleaned' | 'refined' | 'translations';

export const TranscriptionDetailPage: React.FC<{ transcriptionId: string; onEdit: (id: string) => void; }> = ({ transcriptionId, onEdit }) => {
    const { profile } = useAuth();
    const [transcription, setTranscription] = useState<Transcription | null>(null);
    const [translations, setTranslations] = useState<Translation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('cleaned');

    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [transcriptionData, translationsData] = await Promise.all([
                getTranscriptionById(transcriptionId),
                getTranslationsByTranscriptionId(transcriptionId)
            ]);

            if (!transcriptionData) {
                throw new Error("Transcrição não encontrada.");
            }
            
            setTranscription(transcriptionData);
            setTranslations(translationsData);

            if (transcriptionData.cleaned_transcript) {
                setActiveTab('cleaned');
            } else {
                setActiveTab('raw');
            }

        } catch (err) {
            setError('Não foi possível carregar os detalhes da transcrição.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [transcriptionId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleFavorite = async () => {
        if (!transcription) return;
        try {
            const newFavoriteStatus = !transcription.is_favorite;
            await updateTranscription(transcription.id, { is_favorite: newFavoriteStatus });
            setTranscription(prev => prev ? { ...prev, is_favorite: newFavoriteStatus } : null);
        } catch (err) {
            console.error("Failed to update favorite status", err);
        }
    };
    
    const handleDelete = async () => {
        if (!transcription) return;
        setIsDeleting(true);
        try {
            await deleteTranscription(transcription.id);
            window.location.hash = '#/history';
        } catch (err) {
            console.error("Failed to delete", err);
            setError("Não foi possível apagar a transcrição.");
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleBackClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        window.location.hash = '#/history';
    };

    if (isLoading) {
        return <div className="flex-grow flex items-center justify-center"><Loader className="w-8 h-8 text-[#24a9c5]" /></div>;
    }

    if (error || !transcription) {
        return <div className="text-center py-10 text-red-600">{error || 'Transcrição não encontrada.'}</div>;
    }

    const tabs: { id: Tab; label: string; visible: boolean }[] = [
        { id: 'cleaned', label: 'Formatado', visible: !!transcription.cleaned_transcript },
        { id: 'raw', label: 'Literal', visible: !!transcription.raw_transcript },
        { id: 'refined', label: 'Refinado', visible: !!transcription.refined_transcript },
        { id: 'translations', label: `Traduções (${translations.length})`, visible: translations.length > 0 },
    ];
    
    const visibleTabs = tabs.filter(t => t.visible);

    return (
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow animate-fade-in">
            <div className="mb-6">
                <a 
                    href="#/history" 
                    onClick={handleBackClick}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[#24a9c5] dark:hover:text-[#24a9c5]"
                >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Voltar para Minhas Transcrições
                </a>
            </div>

            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
                 <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 break-words">{transcription.filename}</h1>
                 <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4" /> {new Date(transcription.created_at).toLocaleString('pt-PT')}</span>
                    {transcription.original_language && <span className="flex items-center gap-1.5"><TranslateIcon className="w-4 h-4" /> Idioma: {translateLanguageName(transcription.original_language)}</span>}
                 </div>
                 <div className="mt-4 flex items-center gap-2">
                      <button onClick={handleToggleFavorite} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors">
                        {transcription.is_favorite ? <StarIcon className="w-4 h-4 text-yellow-500" /> : <StarOutlineIcon className="w-4 h-4" />}
                        {transcription.is_favorite ? 'Favorito' : 'Adicionar aos Favoritos'}
                     </button>
                      <button onClick={() => setShowDeleteModal(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-100 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900 transition-colors">
                         <TrashIcon className="w-4 h-4" /> Apagar
                     </button>
                 </div>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {visibleTabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id ? 'border-[#24a9c5] text-[#24a9c5]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500'}
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="mt-6">
                {activeTab === 'raw' && <TranscriptDisplay title="" text={transcription.raw_transcript || ''} isLoading={false} isComplete={true} isExpanded={true} isClickable={false} onToggle={() => {}} />}
                {activeTab === 'cleaned' && <TranscriptDisplay title="" text={transcription.cleaned_transcript || ''} renderAsHTML={true} isLoading={false} isComplete={true} isExpanded={true} isClickable={false} onToggle={() => {}} />}
                {activeTab === 'refined' && <TranscriptDisplay title="" text={transcription.refined_transcript || ''} renderAsHTML={true} isLoading={false} isComplete={true} isExpanded={true} isClickable={false} onToggle={() => {}} />}
                {activeTab === 'translations' && (
                    <div className="space-y-4">
                        {translations.map(t => (
                            <div key={t.id} className="bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
                                <h3 className="text-md font-semibold p-4 border-b border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">Tradução para {t.target_language.toUpperCase()}</h3>
                                <div className="p-4 prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: t.translated_text }}></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Apagar Transcrição"
                message={`Tem a certeza que deseja apagar permanentemente "${transcription.filename}"? Esta ação não pode ser desfeita.`}
                isConfirming={isDeleting}
            />
        </main>
    );
};