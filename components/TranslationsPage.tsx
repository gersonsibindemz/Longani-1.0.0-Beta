import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    getAllTranscriptions, 
    Transcription, 
    SavedTranslation, 
    addSavedTranslation, 
    getAllSavedTranslations, 
    updateSavedTranslation, 
    deleteSavedTranslation 
} from '../utils/db';
import { translateText } from '../services/geminiService';
import { Loader } from './Loader';
import { TranslateIcon, ClipboardIcon, CheckIcon, SaveIcon, EditIcon, TrashIcon, ChevronDownIcon } from './Icons';

type TargetLanguage = 'en';
const languageMap: { [key in TargetLanguage]: string } = { en: 'Inglês' };

// Sub-component for displaying and editing a single saved translation
const SavedTranslationItem: React.FC<{
    translation: SavedTranslation;
    onUpdate: (id: string, updates: Partial<SavedTranslation>) => void;
    onDelete: (id: string) => void;
}> = ({ translation, onUpdate, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(translation.translatedText);
    const editorRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isEditing && editorRef.current) {
            editorRef.current.focus();
        }
    }, [isEditing]);

    useEffect(() => {
        if (copied) {
          const timer = setTimeout(() => setCopied(false), 2000);
          return () => clearTimeout(timer);
        }
    }, [copied]);

    const handleSave = () => {
        if (editorRef.current) {
            onUpdate(translation.id, { translatedText: editorRef.current.innerHTML });
            setIsEditing(false);
        }
    };
    
    const handleCancel = () => {
        setEditedContent(translation.translatedText); // Reset content
        setIsEditing(false);
    };

    const handleCopy = () => {
        const textToCopy = editorRef.current?.innerText || '';
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => setCopied(true));
        }
    };
    
    return (
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <header
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between p-4 cursor-pointer"
            >
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{translation.originalFilename}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {languageMap[translation.targetLanguage as TargetLanguage] || translation.targetLanguage} - {new Date(translation.date).toLocaleDateString()}
                    </p>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </header>
            <div className={`transition-[max-height] duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[150vh]' : 'max-h-0'}`}>
                <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div
                        ref={editorRef}
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        className={`prose dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-300 ${isEditing ? 'p-2 rounded-md ring-2 ring-[#24a9c5] bg-white dark:bg-gray-900 focus:outline-none' : ''}`}
                        dangerouslySetInnerHTML={{ __html: editedContent }}
                    />
                    <div className="flex items-center justify-end gap-2 mt-4">
                        {isEditing ? (
                            <>
                                <button onClick={handleCancel} className="px-3 py-1 text-sm rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                                <button onClick={handleSave} className="px-3 py-1 text-sm rounded-md bg-[#24a9c5] text-white hover:bg-[#1e8a9f]">Guardar Alterações</button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleCopy} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                    {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
                                </button>
                                <button onClick={() => setIsEditing(true)} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                    <EditIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => onDelete(translation.id)} className="p-2 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const TranslationsPage: React.FC = () => {
    const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
    const [savedTranslations, setSavedTranslations] = useState<SavedTranslation[]>([]);
    const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string>('');
    const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>('en');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isTranslating, setIsTranslating] = useState(false);
    
    const [translatedText, setTranslatedText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [transcriptionsData, savedTranslationsData] = await Promise.all([
                getAllTranscriptions(),
                getAllSavedTranslations()
            ]);
            setTranscriptions(transcriptionsData);
            setSavedTranslations(savedTranslationsData);
        } catch (err) {
            setError('Não foi possível carregar os dados.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const selectedTranscription = useMemo(() => {
        return transcriptions.find(t => t.id === selectedTranscriptionId);
    }, [selectedTranscriptionId, transcriptions]);

    useEffect(() => {
        setTranslatedText('');
        setError(null);
    }, [selectedTranscriptionId]);
    
    useEffect(() => {
        if (copied) {
          const timer = setTimeout(() => setCopied(false), 2000);
          return () => clearTimeout(timer);
        }
    }, [copied]);

    const handleTranslate = async () => {
        if (!selectedTranscription || !targetLanguage) return;
        setIsTranslating(true);
        setTranslatedText('');
        setError(null);
        let fullTranslatedText = '';

        try {
            const stream = translateText(selectedTranscription.cleanedTranscript, targetLanguage);
            for await (const chunk of stream) {
                fullTranslatedText += chunk;
                setTranslatedText(fullTranslatedText);
            }
        } catch (err) {
            setError('Ocorreu um erro durante a tradução. Por favor, tente novamente.');
            console.error(err);
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSaveTranslation = async () => {
        if (!translatedText || !selectedTranscription) return;
        const newTranslation: SavedTranslation = {
            id: `translation-${Date.now()}`,
            transcriptionId: selectedTranscription.id,
            originalFilename: selectedTranscription.filename,
            date: Date.now(),
            targetLanguage: targetLanguage,
            translatedText: translatedText,
            isFavorite: false,
        };
        try {
            await addSavedTranslation(newTranslation);
            setTranslatedText(''); // Clear the result area
            setSelectedTranscriptionId(''); // Reset selection
            loadData(); // Reload all data
        } catch (err) {
            setError("Falha ao guardar a tradução.");
        }
    };
    
    const handleUpdateSavedTranslation = async (id: string, updates: Partial<SavedTranslation>) => {
        await updateSavedTranslation(id, updates);
        loadData();
    };

    const handleDeleteSavedTranslation = async (id: string) => {
        await deleteSavedTranslation(id);
        loadData();
    };

    const handleCopy = () => {
        if (!translatedText) return;
        const plainText = new DOMParser().parseFromString(translatedText, 'text/html').body.textContent || "";
        navigator.clipboard.writeText(plainText).then(() => setCopied(true));
    };

    return (
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">
                    Traduções
                </h1>

                {isLoading && <div className="text-center py-10"><Loader className="w-8 h-8 text-[#24a9c5]" /></div>}
                
                {!isLoading && transcriptions.length === 0 && (
                    <div className="text-center py-10 text-gray-600 dark:text-gray-400">
                        <p>Nenhuma transcrição encontrada. Crie uma na página inicial para poder traduzir.</p>
                    </div>
                )}
                
                {!isLoading && transcriptions.length > 0 && (
                    <div className="space-y-8">
                        {/* Step 1 & 2: Selection and Action */}
                        <div className="bg-white/60 dark:bg-gray-800/60 p-6 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                             <div>
                                <label htmlFor="transcription-select" className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                    1. Selecione uma Transcrição
                                </label>
                                <select
                                    id="transcription-select"
                                    value={selectedTranscriptionId}
                                    onChange={(e) => setSelectedTranscriptionId(e.target.value)}
                                    className="w-full pl-3 pr-10 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#24a9c5] dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                >
                                    <option value="" disabled>-- Escolha uma transcrição --</option>
                                    {transcriptions.map(t => (
                                        <option key={t.id} value={t.id}>{t.filename}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {selectedTranscription && (
                                <div className="animate-fade-in">
                                    <h2 className="block text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                        2. Escolha o Idioma e Traduza
                                    </h2>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => setTargetLanguage('en')} className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${targetLanguage === 'en' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>
                                                Inglês
                                            </button>
                                        </div>
                                        <button
                                            onClick={handleTranslate}
                                            disabled={isTranslating}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#24a9c5] text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-[#1e8a9f] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                                        >
                                            {isTranslating ? <Loader className="w-5 h-5" /> : <TranslateIcon className="w-5 h-5" />}
                                            <span>{isTranslating ? 'A Traduzir...' : 'Traduzir'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Step 3: Results */}
                        {(isTranslating || translatedText || error) && selectedTranscription && (
                            <div className="animate-fade-in">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Resultado da Tradução</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Original (Formatado)</h3>
                                        <div className="h-96 overflow-y-auto p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                                            <div
                                                className="prose prose-p:text-gray-600 prose-headings:text-gray-800 dark:prose-invert max-w-none"
                                                dangerouslySetInnerHTML={{ __html: selectedTranscription.cleanedTranscript }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">Tradução</h3>
                                            {translatedText && !isTranslating && (
                                                <button onClick={handleCopy} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                                                    {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative h-96 overflow-y-auto p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                                            {isTranslating && <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-gray-900/50"><Loader className="w-8 h-8 text-[#24a9c5]" /></div>}
                                            {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
                                            <div
                                                className="prose dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-300"
                                                dangerouslySetInnerHTML={{ __html: translatedText }}
                                            />
                                        </div>
                                        {translatedText && !isTranslating && (
                                            <div className="mt-4">
                                                <button onClick={handleSaveTranslation} className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-green-700">
                                                    <SaveIcon className="w-5 h-5" />
                                                    <span>Guardar Tradução</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Saved Translations Section */}
                         <div className="mt-12">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                Traduções Salvas
                            </h2>
                            {savedTranslations.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {savedTranslations.map(t => (
                                        <SavedTranslationItem 
                                            key={t.id}
                                            translation={t}
                                            onUpdate={handleUpdateSavedTranslation}
                                            onDelete={handleDeleteSavedTranslation}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-600 dark:text-gray-400">
                                    <p>Nenhuma tradução guardada.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};