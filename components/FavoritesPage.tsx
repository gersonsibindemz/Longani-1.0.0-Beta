import React, { useState, useEffect, useCallback } from 'react';
import { getAllTranscriptions, getAllAudioFiles, updateTranscription, updateAudioFile, getAudioRecording, countUserAudioFiles } from '../utils/db';
import { Transcription, AudioFile, AudioRecording } from '../types';
import { Loader } from './Loader';
import { StarIcon, HistoryIcon, WaveformIcon, PlayIcon, StarOutlineIcon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { TRIAL_MAX_FILES } from '../utils/audioUtils';

type FavoriteItem = (Transcription & { type: 'transcription' }) | (AudioFile & { type: 'audio' });

export const FavoritesPage: React.FC<{ onTranscribe: (audio: AudioRecording) => void, onPlayAudio: (audio: AudioRecording) => void }> = ({ onTranscribe, onPlayAudio }) => {
    const { profile } = useAuth();
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'transcription' | 'audio'>('all');
    const [trialUsageCount, setTrialUsageCount] = useState(0);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [transcriptions, audioFiles] = await Promise.all([
                getAllTranscriptions(),
                getAllAudioFiles(),
            ]);

            const favTranscriptions = transcriptions.filter(t => t.is_favorite).map(t => ({ ...t, type: 'transcription' as const }));
            const favAudio = audioFiles.filter(a => a.is_favorite).map(a => ({ ...a, type: 'audio' as const }));

            const allFavorites = [...favTranscriptions, ...favAudio];
            allFavorites.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setFavorites(allFavorites);
            
            if (profile?.plan === 'trial') {
                const count = await countUserAudioFiles(profile.id);
                setTrialUsageCount(count);
            }

        } catch (err) {
            setError('Não foi possível carregar os favoritos.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleUnfavorite = async (item: FavoriteItem) => {
        try {
            if (item.type === 'transcription') {
                await updateTranscription(item.id, { is_favorite: false });
            } else {
                await updateAudioFile(item.id, { is_favorite: false });
            }
            fetchData(); // Refresh the list
        } catch (err) {
            console.error("Failed to unfavorite", err);
        }
    };

    const handleAction = async (item: FavoriteItem) => {
        if (item.type === 'transcription') {
            sessionStorage.setItem('loadTranscriptionId', item.id);
            window.location.hash = '#/home';
        } else {
            // For audio, we'll offer to play it or transcribe it.
            // For simplicity in this view, let's default to transcribing it.
            const recording = await getAudioRecording(item.id);
            if (recording) {
                onTranscribe(recording);
            }
        }
    };

    const filteredFavorites = favorites.filter(item => filter === 'all' || item.type === filter);
    const isTrialPlan = profile?.plan === 'trial';
    const isTrialUploadsLocked = isTrialPlan && trialUsageCount >= TRIAL_MAX_FILES;

    if (isLoading) {
        return <div className="flex-grow flex items-center justify-center"><Loader className="w-8 h-8 text-[#24a9c5]" /></div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-600">{error}</div>;
    }
    
    return (
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">Favoritos</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Aceda rapidamente aos seus ficheiros mais importantes.</p>
            
            <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm font-medium rounded-full ${filter === 'all' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>Todos</button>
                <button onClick={() => setFilter('transcription')} className={`px-3 py-1 text-sm font-medium rounded-full ${filter === 'transcription' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>Transcrições</button>
                <button onClick={() => setFilter('audio')} className={`px-3 py-1 text-sm font-medium rounded-full ${filter === 'audio' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>Áudios</button>
            </div>

            {filteredFavorites.length === 0 ? (
                 <div className="text-center py-16">
                    <StarOutlineIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto" />
                    <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">Nenhum favorito encontrado</h2>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">Clique na estrela ☆ para adicionar um ficheiro aos favoritos.</p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFavorites.map(item => (
                        <li key={item.id} className="bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 rounded-full ${item.type === 'transcription' ? 'bg-cyan-100 dark:bg-cyan-900/50' : 'bg-purple-100 dark:bg-purple-900/50'}`}>
                                        {item.type === 'transcription' ? 
                                            <HistoryIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> : 
                                            <WaveformIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        }
                                    </div>
                                    <button onClick={() => handleUnfavorite(item)} title="Remover dos favoritos" className="p-1 text-yellow-400 hover:text-yellow-500">
                                        <StarIcon className="w-6 h-6" />
                                    </button>
                                </div>
                                <h3 className="mt-3 font-semibold text-gray-800 dark:text-gray-200 truncate">{item.type === 'transcription' ? item.filename : item.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(item.created_at).toLocaleDateString('pt-PT')}</p>
                            </div>
                            <div className="mt-4">
                                {item.type === 'transcription' ? (
                                    <button onClick={() => handleAction(item)} className="w-full text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline">Ver Transcrição</button>
                                ): (
                                     <button onClick={() => handleAction(item)} disabled={isTrialUploadsLocked} className="w-full text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed">Transcrever</button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
};
