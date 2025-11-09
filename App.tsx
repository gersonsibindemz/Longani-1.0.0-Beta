import React, { useState, useCallback, useEffect, useMemo, useRef, useReducer } from 'react';
import { Header, longaniLogoUrl } from './components/Header';
import { HistoryPage } from './components/HistoryPage';
import { RecordingsPage } from './components/RecordingsPage';
import { NowPlayingBar } from './components/NowPlayingBar';
import { FavoritesPage } from './components/FavoritesPage';
import { TranslationsPage } from './components/TranslationsPage';
import { LoginPage } from './components/LoginPage';
import { SignUpPage } from './components/SignUpPage';
import { ProfilePage } from './components/ProfilePage';
import { TeamsPage } from './components/TeamsPage';
import DesktopNotice from './components/DesktopNotice';
import { PlansPage } from './components/PlansPage';
import { useAuth } from './contexts/AuthContext';
import type { Theme, PreferredLanguage, AudioRecording, Transcription, RecordingQuality, TranscriptionState, TranscriptionAction, ProcessStage, ExpandedTranscript, OutputPreference } from './types';
import { TranscriptionDetailPage } from './components/TranscriptionDetailPage';
import { ProcessingLogOverlay } from './components/ProcessingLogOverlay';
import { Loader } from './components/Loader';
import { CloseIcon, HistoryIcon, ReloadIcon, SearchIcon, UsersIcon } from './components/Icons';
import { TranscriptionWorkspace } from './components/TranscriptionWorkspace';
import { getAllTranscriptions, getTranscriptionById, getAudioRecording, getTranscriptionByAudioId } from './utils/db';
import { useUserStatus } from './hooks/useUserStatus';
// Fix: Import missing functions: getAudioDuration, estimateProcessingTime, estimatePrecisionPotential
import { getAudioDuration, estimateProcessingTime, estimatePrecisionPotential } from './utils/audioUtils';
// Fix: Import missing function: detectLanguage
import { detectLanguage } from './services/geminiService';

const getCurrentPage = () => window.location.hash.replace(/^#\/?/, '') || 'home';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Only search transcriptions
type SearchResult = { type: 'transcription', item: Transcription };

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    // Only store transcriptions
    const [allTranscriptions, setAllTranscriptions] = useState<Transcription[]>([]);
    const hasLoadedData = useRef(false);

    useEffect(() => {
        if (isOpen && !hasLoadedData.current) {
            setIsLoading(true);
            const loadAllData = async () => {
                try {
                    // Only fetch transcriptions
                    const transcriptions = await getAllTranscriptions();
                    setAllTranscriptions(transcriptions);
                    hasLoadedData.current = true;
                } catch (e) {
                    console.error("Failed to load data for search", e);
                } finally {
                    setIsLoading(false);
                }
            };
            loadAllData();
        }
    }, [isOpen]);
    
    const searchResults = useMemo((): SearchResult[] => {
        if (!searchTerm.trim()) return [];
        const query = searchTerm.toLowerCase();

        const results: SearchResult[] = [];

        allTranscriptions.forEach(item => {
            if (item.filename.toLowerCase().includes(query) || (item.raw_transcript && item.raw_transcript.toLowerCase().includes(query)) || (item.cleaned_transcript && item.cleaned_transcript.toLowerCase().includes(query))) {
                results.push({ type: 'transcription', item });
            }
        });

        // Simple relevance sort: filename matches first.
        results.sort((a, b) => {
            const aName = a.item.filename;
            const bName = b.item.filename;
            const aMatch = aName.toLowerCase().includes(query);
            const bMatch = bName.toLowerCase().includes(query);
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime(); // Secondary sort by date
        });

        return results;
    }, [searchTerm, allTranscriptions]);

    const handleResultClick = (result: SearchResult) => {
        onClose();
        setSearchTerm(''); // Reset for next time
        window.location.hash = `#/transcription/${result.item.id}`;
    };
    
    const inputRef = React.useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setSearchTerm(''); // Clear search on close
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm animate-fade-in">
            <header className="flex-shrink-0 p-4 flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70">
                <SearchIcon className="w-5 h-5 text-gray-400" />
                <input
                    ref={inputRef}
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquisar nas minhas transcrições..."
                    className="w-full bg-transparent focus:outline-none text-lg text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
                />
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 rounded-full">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </header>
            <div className="flex-grow overflow-y-auto p-4 md:p-6">
              <div className="max-w-3xl mx-auto">
                {isLoading && (
                    <div className="flex justify-center items-center h-full py-10">
                        <Loader className="w-8 h-8 text-[#24a9c5]" />
                    </div>
                )}
                {!isLoading && searchTerm.trim() && searchResults.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        Nenhum resultado encontrado para "{searchTerm}".
                    </div>
                )}
                {!isLoading && searchResults.length > 0 && (
                    <ul className="space-y-3">
                        {searchResults.map((result, index) => (
                            <li key={`${result.type}-${result.item.id}-${index}`} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                <button onClick={() => handleResultClick(result)} className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#24a9c5] dark:hover:border-[#24a9c5] hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-cyan-100 dark:bg-cyan-900/50 rounded-full">
                                            <HistoryIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate text-gray-800 dark:text-gray-200">
                                                {result.item.filename}
                                            </p>
                                            <p className="text-xs capitalize text-gray-500 dark:text-gray-400">
                                                Transcrição
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {!isLoading && !searchTerm.trim() && (
                    <div className="text-center py-10 text-gray-500">
                        
                    </div>
                )}
              </div>
            </div>
        </div>
    );
};

const FeatureLockedPage: React.FC<{featureName: string, requiredPlan: string}> = ({featureName, requiredPlan}) => (
    <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex items-center justify-center">
        <div className="text-center py-16 animate-fade-in-up">
            <UsersIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto" />
            <h1 className="mt-4 text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">Funcionalidade {featureName} Bloqueada</h1>
            <p className="mt-2 max-w-prose mx-auto text-gray-600 dark:text-gray-400">
                Esta funcionalidade está disponível apenas para utilizadores com o plano <span className="font-semibold">{requiredPlan}</span>.
            </p>
        </div>
    </main>
);

const UpdateNotification: React.FC<{ onUpdate: () => void; onClose: () => void }> = ({ onUpdate, onClose }) => (
    <div role="alert" className="fixed bottom-4 right-4 z-[100] animate-fade-in-up">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4 max-w-sm">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/50 rounded-full">
                <ReloadIcon className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="flex-grow">
                <p className="font-semibold text-gray-800 dark:text-gray-200">Atualização Disponível</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uma nova versão do Longani foi instalada.</p>
            </div>
            <button
                onClick={onUpdate}
                className="ml-auto flex-shrink-0 px-4 py-2 bg-cyan-500 text-white text-sm font-semibold rounded-md hover:bg-cyan-600 transition-colors"
            >
                Recarregar
            </button>
             <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full flex-shrink-0">
                <CloseIcon className="w-5 h-5" />
            </button>
        </div>
    </div>
);


// --- REDUCER LOGIC ---
const initialState: TranscriptionState = {
    audioFile: null,
    audioUrl: null,
    rawTranscript: '',
    cleanedTranscript: '',
    processStage: 'idle',
    error: null,
    estimatedTime: null,
    precisionPotential: null,
    initialPrecision: null,
    expandedTranscript: 'none',
    fileSelectionSuccess: false,
    outputPreference: 'both',
    currentAudioId: null,
    currentTranscriptionId: null,
    transcriptionToUpdateId: null,
    audioDuration: 0,
    processingTime: null,
    isDetectingLanguage: false,
    detectedLanguage: null,
    isRefining: false,
    advancedTranscript: '',
    advancedTranscriptTitle: '',
    isSaving: false,
};

function transcriptionReducer(state: TranscriptionState, action: TranscriptionAction): TranscriptionState {
    switch (action.type) {
        case 'RESET':
            if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
            return initialState;
        case 'SET_FILE':
            return {
                ...initialState,
                audioFile: action.payload.file,
                audioUrl: action.payload.url,
                audioDuration: action.payload.duration,
                estimatedTime: action.payload.estimatedTime,
                precisionPotential: action.payload.precision,
                initialPrecision: action.payload.precision,
                fileSelectionSuccess: true,
            };
        case 'START_LANGUAGE_DETECTION':
            return { ...state, isDetectingLanguage: true, detectedLanguage: null };
        case 'SET_LANGUAGE':
            return { ...state, isDetectingLanguage: false, detectedLanguage: action.payload.language, error: action.payload.error || state.error };
        case 'FILE_ERROR':
            return { ...initialState, error: action.payload.error };
        case 'START_PROCESSING':
            return { ...state, processStage: 'transcribing', error: null, rawTranscript: '', cleanedTranscript: '', advancedTranscript: '', processingTime: null };
        case 'UPDATE_RAW_TRANSCRIPT': {
            const newRawTranscript = state.rawTranscript + action.payload.chunk;
            const dynamicPrecision = state.initialPrecision !== null ? Math.round(Math.max(40, state.initialPrecision - ((newRawTranscript.match(/\[inaudible\]/gi) || []).length * 3))) : null;
            return { ...state, rawTranscript: newRawTranscript, precisionPotential: dynamicPrecision };
        }
        case 'FINALIZE_RAW_TRANSCRIPT': {
            const finalPrecision = state.initialPrecision !== null ? Math.round(Math.max(40, state.initialPrecision - ((action.payload.transcript.match(/\[inaudible\]/gi) || []).length * 3))) : null;
            return { ...state, rawTranscript: action.payload.transcript, processStage: 'cleaning', precisionPotential: finalPrecision };
        }
        case 'UPDATE_CLEANED_TRANSCRIPT':
            return { ...state, cleanedTranscript: state.cleanedTranscript + action.payload.chunk };
        case 'FINALIZE_CLEANED_TRANSCRIPT':
            return { ...state, cleanedTranscript: action.payload.transcript };
        case 'COMPLETE_PROCESSING':
            return { ...state, processStage: 'completed', processingTime: action.payload.time };
        case 'PROCESSING_ERROR':
            return { ...state, processStage: 'idle', error: action.payload.error };
        case 'SET_OUTPUT_PREFERENCE':
            return { ...state, outputPreference: action.payload };
        case 'TOGGLE_EXPANDED':
            return { ...state, expandedTranscript: state.expandedTranscript === action.payload ? 'none' : action.payload };
        case 'LOAD_EXISTING':
            return { ...initialState, ...action.payload, processStage: 'completed' };
        case 'START_SAVING':
            return { ...state, isSaving: true, error: null };
        case 'FINISH_SAVING':
            return { ...state, isSaving: false, currentTranscriptionId: action.payload.transcriptionId, currentAudioId: action.payload.audioId ?? state.currentAudioId };
        case 'SAVING_ERROR':
            return { ...state, isSaving: false, error: action.payload.error };
        case 'START_REFINING':
            return { ...state, isRefining: true, advancedTranscript: '', advancedTranscriptTitle: action.payload.title, error: null };
        case 'UPDATE_ADVANCED_TRANSCRIPT':
            return { ...state, advancedTranscript: state.advancedTranscript + action.payload.chunk };
        case 'FINISH_REFINING':
            return { ...state, isRefining: false, advancedTranscript: action.payload.transcript, currentTranscriptionId: action.payload.transcriptionId || state.currentTranscriptionId };
        case 'REFINING_ERROR':
            return { ...state, isRefining: false, error: action.payload.error };
        case 'SET_TRANSCRIPTION_TO_UPDATE':
            return { ...state, transcriptionToUpdateId: action.payload.id };
        case 'SET_CURRENT_AUDIO_ID':
            return { ...state, currentAudioId: action.payload.id };
        default:
            return state;
    }
}

const App: React.FC = () => {
  const { session, profile, loading } = useAuth();
  const userStatus = useUserStatus();
  
  // Consolidate transcription state into a reducer
  const [state, dispatch] = useReducer(transcriptionReducer, initialState);

  // General App State
  const [page, setPage] = useState<string>(getCurrentPage());
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [recentTranscriptions, setRecentTranscriptions] = useState<Transcription[]>([]);
  const [showDesktopLock, setShowDesktopLock] = useState(window.innerWidth >= 1280);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [processingLog, setProcessingLog] = useState<{ steps: string[], currentStep: number } | null>(null);

  // Now Playing State
  const [nowPlaying, setNowPlaying] = useState<AudioRecording | null>(null);
  const [nowPlayingUrl, setNowPlayingUrl] = useState<string | null>(null);

  // Service Worker Update State
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  // Resets the entire app state, including the audio player.
  // Used when loading a new file context (e.g., editing, transcribing from recordings).
  const resetApp = useCallback(() => {
    dispatch({ type: 'RESET' });
    if (nowPlayingUrl) URL.revokeObjectURL(nowPlayingUrl);
    setNowPlaying(null);
    setNowPlayingUrl(null);
  }, [nowPlayingUrl]);

  // Resets only the transcription workspace state.
  // Used for general navigation to the home page, allowing audio to continue playing.
  const resetWorkspace = useCallback(() => {
      dispatch({ type: 'RESET' });
  }, [dispatch]);

  const loadTranscriptionForEditing = async (id: string) => {
    try {
        const transcription = await getTranscriptionById(id);
        if (!transcription) {
            throw new Error("A transcrição não foi encontrada.");
        }

        let audioForPlayer: AudioRecording | null = null;
        if (transcription.audio_id) {
            audioForPlayer = await getAudioRecording(transcription.audio_id);
        }

        resetApp();
        
        const loadedState: Partial<TranscriptionState> = {
            rawTranscript: transcription.raw_transcript || '',
            cleanedTranscript: transcription.cleaned_transcript || '',
            detectedLanguage: transcription.original_language || 'N/A',
            currentTranscriptionId: transcription.id,
        };
        
        if (transcription.refined_transcript && transcription.refined_content_type && transcription.refined_output_format) {
             const title = `${transcription.refined_output_format} (${transcription.refined_content_type})`;
             loadedState.advancedTranscript = transcription.refined_transcript;
             loadedState.advancedTranscriptTitle = title;
        }

        if (audioForPlayer) {
            const file = new File([audioForPlayer.audioBlob], audioForPlayer.name, { type: audioForPlayer.audioBlob.type });
            loadedState.audioFile = file;
            loadedState.audioUrl = URL.createObjectURL(file);
            loadedState.currentAudioId = audioForPlayer.id;
            try {
                const duration = await getAudioDuration(file);
                loadedState.audioDuration = duration;
            } catch { /* Ignore duration errors on reload */ }
        }
        
        dispatch({ type: 'LOAD_EXISTING', payload: loadedState });
    } catch (err) {
        console.error(err);
        dispatch({ type: 'PROCESSING_ERROR', payload: { error: "Não foi possível carregar a transcrição para edição." }});
        window.location.hash = '#/history'; // Redirect back if loading fails
    }
  };


  useEffect(() => {
    const handleHashChange = () => setPage(getCurrentPage());
    window.addEventListener('hashchange', handleHashChange, false);
    return () => window.removeEventListener('hashchange', handleHashChange, false);
  }, []);
  
  // Effect to listen for service worker updates
  useEffect(() => {
    const handleSWUpdate = (event: Event) => {
      const registration = (event as CustomEvent).detail;
      if (registration && registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowUpdatePrompt(true);
      }
    };
    window.addEventListener('swUpdate', handleSWUpdate);
    return () => window.removeEventListener('swUpdate', handleSWUpdate);
  }, []);

  // Effect to load recent items or a specific item for editing
  useEffect(() => {
    const loadRecents = async () => {
        if (page === 'home') {
            try {
                const all = await getAllTranscriptions();
                setRecentTranscriptions(all.slice(0, 10)); // Get latest 10
            } catch (e) {
                console.error("Failed to load recent transcriptions:", e);
            }
        }
    };
    
    const loadId = sessionStorage.getItem('loadTranscriptionId');
    if (page === 'home' && loadId) {
        sessionStorage.removeItem('loadTranscriptionId');
        loadTranscriptionForEditing(loadId);
    } else {
       loadRecents();
    }
  }, [page]);
  
  // Effect for initial app visibility animation
  useEffect(() => {
    const img = new Image();
    img.src = longaniLogoUrl;
    const showApp = () => setIsAppVisible(true);

    img.onload = showApp;
    img.onerror = showApp; // Show app even if logo fails

    // Fallback timer for cached images
    const timer = setTimeout(showApp, 2500);

    return () => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };
  }, []);
  
  // Effect to handle desktop lock message
  useEffect(() => {
    const checkScreenSize = () => setShowDesktopLock(window.innerWidth >= 1280);
    window.addEventListener('resize', checkScreenSize);
    checkScreenSize();
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Effect to clean up object URLs
  useEffect(() => {
    const currentAudioUrl = state.audioUrl;
    const currentNowPlayingUrl = nowPlayingUrl;
    return () => {
      if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl);
      if (currentNowPlayingUrl) URL.revokeObjectURL(currentNowPlayingUrl);
    };
  }, [state.audioUrl, nowPlayingUrl]);

  const handleTranscribeFromRecordings = async (audio: AudioRecording) => {
    const steps = [
        'A carregar o seu ficheiro de áudio...',
        'A preparar o ambiente de transcrição...',
        'A analisar o idioma do áudio...',
        'A finalizar e a redirecionar...'
    ];
    setProcessingLog({ steps, currentStep: 0 }); // Show log, step 1
    
    await new Promise(resolve => setTimeout(resolve, 500)); // UX delay
    setProcessingLog(prev => prev ? { ...prev, currentStep: 1 } : null); // Show log, step 2

    // Reset state via reducer
    resetApp();

    const file = new File([audio.audioBlob], audio.name, {
      type: audio.audioBlob.type || 'audio/wav',
    });

    try {
        const existingTranscription = await getTranscriptionByAudioId(audio.id);
        if (existingTranscription) {
            dispatch({ type: 'SET_TRANSCRIPTION_TO_UPDATE', payload: { id: existingTranscription.id } });
        }
    } catch (e) { console.error("Could not fetch existing transcription for update", e); }
    
    dispatch({ type: 'SET_CURRENT_AUDIO_ID', payload: { id: audio.id } });

    // This is a simplified version of handleFileChange, dispatched directly.
    // It is simplified because we don't need to check trial limits here as it's a pre-existing file.
    try {
        const duration = await getAudioDuration(file);
        const url = URL.createObjectURL(file);
        const estimatedTime = estimateProcessingTime(duration);
        const precision = estimatePrecisionPotential(file.name);
        dispatch({ type: 'SET_FILE', payload: { file, url, duration, estimatedTime, precision } });
    } catch (err) {
        const errorMessage = 'Não foi possível ler a duração do áudio. O ficheiro pode estar corrompido ou num formato não suportado.';
        dispatch({ type: 'FILE_ERROR', payload: { error: errorMessage }});
    }

    await new Promise(resolve => setTimeout(resolve, 500)); // UX delay
    setProcessingLog(prev => prev ? { ...prev, currentStep: 2 } : null); // Show log, step 3
    
    dispatch({ type: 'START_LANGUAGE_DETECTION' });
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const lang = await detectLanguage(base64, file.type);
            dispatch({ type: 'SET_LANGUAGE', payload: { language: lang } });
        };
        reader.onerror = () => { throw new Error("File reading failed"); };
    } catch (err) {
        dispatch({ type: 'SET_LANGUAGE', payload: { language: "Indeterminate", error: "Não foi possível detetar o idioma." } });
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay
    setProcessingLog(prev => prev ? { ...prev, currentStep: 3 } : null); // Show log, step 4
    
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.hash = '#/home';
    setProcessingLog(null); // Hide after navigation
  };

  const stopNowPlaying = useCallback(() => {
    // If audio is currently playing in the bar, stop it.
    if (nowPlaying) {
        if (nowPlayingUrl) URL.revokeObjectURL(nowPlayingUrl);
        setNowPlaying(null);
        setNowPlayingUrl(null);
    }
  }, [nowPlaying, nowPlayingUrl]);

  const handlePlayAudio = (audio: AudioRecording) => {
    if (nowPlaying?.id === audio.id) return;
    if (nowPlayingUrl) URL.revokeObjectURL(nowPlayingUrl);
    const url = URL.createObjectURL(audio.audioBlob);
    setNowPlaying(audio);
    setNowPlayingUrl(url);
  };

  const handleUpdateAvailable = () => {
    if (waitingWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    setShowUpdatePrompt(false);
  };

  const handleHistoryClick = (transcriptionId: string) => {
    window.location.hash = `#/transcription/${transcriptionId}`;
  };

  const renderPage = () => {
    if (loading) {
        return (
            <div className="flex-grow flex items-center justify-center">
                <Loader className="w-12 h-12 text-[#24a9c5]" />
            </div>
        );
    }

    if (!session) {
        switch (page) {
            case 'signup':
                return <SignUpPage />;
            case 'login':
            default:
                return <LoginPage />;
        }
    }
    
    const urlParts = page.split('/');
    switch (urlParts[0]) {
      case 'profile':
        return <ProfilePage />;
      case 'history':
        return <HistoryPage />;
      case 'recordings':
        const preferredRecordingQuality = (profile?.preferences as any)?.recordingQuality || 'standard';
        return <RecordingsPage onTranscribe={handleTranscribeFromRecordings} onPlayAudio={handlePlayAudio} uploadDisabled={profile?.plan === 'trial'} preferredQuality={preferredRecordingQuality} onStartRecording={stopNowPlaying} />;
      case 'favorites':
        if (profile?.plan === 'trial') {
            return <FeatureLockedPage featureName="Favoritos" requiredPlan="Básico ou superior" />;
        }
        return <FavoritesPage onTranscribe={handleTranscribeFromRecordings} onPlayAudio={handlePlayAudio} />;
      case 'teams':
        const canAccessTeams = profile?.plan === 'ideal' || profile?.plan === 'premium';
        if (!canAccessTeams) {
            return <FeatureLockedPage featureName="Equipas" requiredPlan="Ideal ou superior" />;
        }
        return <TeamsPage />;
      case 'translations':
        if (profile?.plan === 'trial') {
            return <FeatureLockedPage featureName="Traduções" requiredPlan="Básico ou superior" />;
        }
        return <TranslationsPage />;
      case 'transcription':
          if (urlParts[1]) {
              return <TranscriptionDetailPage transcriptionId={urlParts[1]} onEdit={loadTranscriptionForEditing} />;
          }
          window.location.hash = '#/home'; // Fallback
          return null;
      case 'plans':
        return <PlansPage />;
      case 'home':
      default:
        const recentHistorySection = (
            <div className="w-full max-w-3xl mx-auto mb-8 animate-fade-in">
              <h4 className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Histórico Recente</h4>
              {recentTranscriptions.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto pr-2">
                    <ul className="space-y-3">
                        {recentTranscriptions.map(t => (
                            <li key={t.id}>
                                <button onClick={() => handleHistoryClick(t.id)} className="w-full text-left p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#24a9c5] dark:hover:border-[#24a9c5] hover:shadow-md transition-all">
                                    <div className="flex justify-between items-center gap-4">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title={t.filename}>{t.filename}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                            {new Date(t.created_at).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                  </div>
              ) : (
                  <div className="text-center py-6 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma transcrição recente encontrada.</p>
                  </div>
              )}
            </div>
        );
        return (
          <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col">
            <TranscriptionWorkspace 
              state={state} 
              dispatch={dispatch} 
              userStatus={userStatus} 
              recentHistorySection={recentHistorySection}
              onFileReady={stopNowPlaying}
            />
          </main>
        );
    }
  };
  
  if (showDesktopLock) {
    return <DesktopNotice />;
  }

  const preferredLanguage = (profile?.preferences as any)?.language || 'pt';

  return (
    <>
      {processingLog && <ProcessingLogOverlay steps={processingLog.steps} currentStep={processingLog.currentStep} />}
      <div className={`min-h-screen flex flex-col transition-opacity duration-500 ease-in-out ${isAppVisible ? 'opacity-100' : 'opacity-0'} ${nowPlaying ? 'pb-24 sm:pb-20' : ''}`}>
        {session && profile && (
          <Header 
            page={page} 
            preferredLanguage={preferredLanguage}
            onSearchClick={() => setIsSearchOpen(true)}
            onHomeReset={resetWorkspace}
          />
        )}
        {renderPage()}
        {session && (
            <footer className="hidden sm:block text-center py-6 text-gray-500 dark:text-gray-400 text-sm select-none">
                <p>
                    © {new Date().getFullYear()} Longani &middot; v.1.0.0 Beta
                </p>
            </footer>
        )}
      </div>
      {nowPlaying && nowPlayingUrl && session && (
        <NowPlayingBar 
          audio={nowPlaying} 
          audioUrl={nowPlayingUrl} 
          onClose={() => {
              if (nowPlayingUrl) URL.revokeObjectURL(nowPlayingUrl);
              setNowPlaying(null);
              setNowPlayingUrl(null);
          }}
        />
      )}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      {showUpdatePrompt && <UpdateNotification onUpdate={handleUpdateAvailable} onClose={() => setShowUpdatePrompt(false)} />}
    </>
  );
};

export default App;