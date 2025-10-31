import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { transcribeAudio, cleanTranscript, translateText, refineTranscript, detectLanguage } from './services/geminiService';
import { Header, longaniLogoUrl } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { ProgressBar } from './components/ProgressBar';
import { Loader } from './components/Loader';
import { ArrowRightIcon, ReloadIcon, ClockIcon, TargetIcon, InfoIcon, HistoryIcon, ColumnsIcon, SparkleIcon, CloseIcon, SearchIcon, WaveformIcon, TranslateIcon, UsersIcon } from './components/Icons';
import { getAudioDuration, estimateProcessingTime, estimatePrecisionPotential, calculateDynamicPrecision, getFriendlyErrorMessage, formatProcessingTime, translateLanguageName, isTrialActive, calculateMonthlyUsage } from './utils/audioUtils';
import { HistoryPage } from './components/HistoryPage';
import { RecordingsPage } from './components/RecordingsPage';
import { addTranscription, addAudioFile, getAllTranscriptions, getTranscriptionById, getAudioRecording, updateTranscription, deleteTranscription, getAudioFilesForCurrentMonth } from './utils/db';
import { NowPlayingBar } from './components/NowPlayingBar';
import { FavoritesPage } from './components/FavoritesPage';
import { TranslationsPage } from './components/TranslationsPage';
import { CustomAudioPlayer } from './components/CustomAudioPlayer';
import { LoginPage } from './components/LoginPage';
import { RefineModal } from './components/RefineModal';
import type { RefineContentType, RefineOutputFormat } from './services/geminiService';
import { SignUpPage } from './components/SignUpPage';
import { ProfilePage } from './components/ProfilePage';
import { TeamsPage } from './components/TeamsPage';
import DesktopNotice from './components/DesktopNotice';
import { PlansPage } from './components/PlansPage';
import { useAuth } from './contexts/AuthContext';
import { GoogleDrivePicker } from './components/GoogleDrivePicker';
import type { Theme, PreferredLanguage, AudioRecording, AudioFile, Transcription } from './types';


type ProcessStage = 'idle' | 'transcribing' | 'cleaning' | 'completed';
type ExpandedTranscript = 'raw' | 'cleaned' | 'none';
type OutputPreference = 'both' | 'raw' | 'cleaned';

const languageMap: { [key in PreferredLanguage]: string } = {
  pt: 'Português',
  en: 'English',
};

const contentLabels: { [key in RefineContentType]: string } = {
    'meeting': 'Reunião',
    'sermon': 'Sermão',
    'interview': 'Entrevista',
    'lecture': 'Palestra',
    'note': 'Nota Pessoal',
};

const formatLabels: { [key in RefineOutputFormat]: string } = {
    'meeting-report': 'Relatório de Reunião',
    'report': 'Relatório Detalhado',
    'article': 'Artigo Envolvente',
    'key-points': 'Resumo de Pontos-Chave',
    'action-items': 'Lista de Ações',
};

const getRefinedTitle = (contentType?: string, outputFormat?: string): string => {
    if (!contentType || !outputFormat) {
        return 'Documento Refinado';
    }
    const contentLabel = contentLabels[contentType as RefineContentType] || 'Conteúdo';
    const formatLabel = formatLabels[outputFormat as RefineOutputFormat] || 'Documento';

    return `${formatLabel} (${contentLabel})`;
};

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
        // Since we only have transcriptions, no switch is needed.
        sessionStorage.setItem('highlightTranscriptionId', result.item.id);
        window.location.hash = '#/history';
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
            <a href="#/plans" className="inline-block mt-6 px-6 py-2.5 text-sm font-bold text-white bg-[#24a9c5] rounded-full hover:bg-[#1e8a9f] transition-colors">
                Ver Planos e Fazer Upgrade
            </a>
        </div>
    </main>
);


const App: React.FC = () => {
  const { session, profile, loading, signOut, updateProfilePreferences } = useAuth();
  const currentUser = profile; // Use profile as the main user object for app logic

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [cleanedTranscript, setCleanedTranscript] = useState<string>('');
  const [processStage, setProcessStage] = useState<ProcessStage>('idle');
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [precisionPotential, setPrecisionPotential] = useState<number | null>(null);
  const [initialPrecision, setInitialPrecision] = useState<number | null>(null);
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>('pt');
  const [expandedTranscript, setExpandedTranscript] = useState<ExpandedTranscript>('none');
  const [fileSelectionSuccess, setFileSelectionSuccess] = useState(false);
  const [outputPreference, setOutputPreference] = useState<OutputPreference>('both');
  const [page, setPage] = useState<string>(getCurrentPage());
  const [nowPlaying, setNowPlaying] = useState<AudioRecording | null>(null);
  const [nowPlayingUrl, setNowPlayingUrl] = useState<string | null>(null);
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  const [currentTranscriptionId, setCurrentTranscriptionId] = useState<string | null>(null);
  const [recentTranscriptions, setRecentTranscriptions] = useState<Transcription[]>([]);
  const [showDesktopLock, setShowDesktopLock] = useState(window.innerWidth >= 1280);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  
  // State for real-time progress and final stats
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [processingTime, setProcessingTime] = useState<string | null>(null);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  // State for Advanced Refinement
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [advancedTranscript, setAdvancedTranscript] = useState<string>('');
  const [advancedTranscriptTitle, setAdvancedTranscriptTitle] = useState<string>('');

  const isEffectivelyDark = theme === 'dark';

  const MAX_FILE_SIZE_MB = 100;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

        handleReset();

        if (audioForPlayer) {
            const file = new File([audioForPlayer.audioBlob], audioForPlayer.name, { type: audioForPlayer.audioBlob.type });
            setAudioFile(file);
            setAudioUrl(URL.createObjectURL(file));
            setCurrentAudioId(audioForPlayer.id);
            try {
                const duration = await getAudioDuration(file);
                setAudioDuration(duration);
                 // Since we are loading, we can't re-detect the language easily without the base64.
                // We'll set a placeholder. The original language is preserved in the raw transcript.
                setDetectedLanguage(transcription.original_language || 'N/A');
            } catch {
                // Ignore duration errors on reload
            }
        }

        setRawTranscript(transcription.raw_transcript || '');
        setCleanedTranscript(transcription.cleaned_transcript || '');
        if (transcription.refined_transcript && transcription.refined_content_type && transcription.refined_output_format) {
            setAdvancedTranscript(transcription.refined_transcript);
            setAdvancedTranscriptTitle(getRefinedTitle(transcription.refined_content_type, transcription.refined_output_format));
        }
        
        setCurrentTranscriptionId(transcription.id);
        setProcessStage('completed'); // Set the state to show results
    } catch (err) {
        console.error(err);
        setError("Não foi possível carregar a transcrição para edição.");
        window.location.hash = '#/history'; // Redirect back if loading fails
    }
  };


  useEffect(() => {
    const handleHashChange = () => {
      setPage(getCurrentPage());
    };
    window.addEventListener('hashchange', handleHashChange, false);
    return () => {
      window.removeEventListener('hashchange', handleHashChange, false);
    };
  }, []);

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

  useEffect(() => {
    const calculateUsage = async () => {
        if (currentUser) {
            try {
                const audioFiles: AudioFile[] = await getAudioFilesForCurrentMonth();
                const usage = calculateMonthlyUsage(audioFiles);
                setMonthlyUsage(usage);
            } catch (e) {
                let errorDetails = '';
                if (e instanceof Error) {
                    errorDetails = e.message;
                } else if (e && typeof e === 'object' && 'message' in e) {
                    errorDetails = String((e as { message: string }).message);
                } else {
                    errorDetails = String(e);
                }
                console.error(`Failed to calculate monthly usage. Details: ${errorDetails}`, e);
            }
        } else {
            setMonthlyUsage(0); // Reset if no user is logged in
        }
    };

    calculateUsage();
  }, [currentUser, page, processStage]);

  // Load preferences from user profile
  useEffect(() => {
    if (profile?.preferences) {
        const prefs = profile.preferences as { theme?: Theme, language?: PreferredLanguage };
        if (prefs.theme) setTheme(prefs.theme);
        if (prefs.language) setPreferredLanguage(prefs.language);
    }
  }, [profile]);


  // This useEffect runs once on mount to handle initial loading animation.
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
  
  // This useEffect handles the desktop message banner.
  useEffect(() => {
    const checkScreenSize = () => {
        setShowDesktopLock(window.innerWidth >= 1280);
    };

    window.addEventListener('resize', checkScreenSize);
    
    // Initial check
    checkScreenSize();

    return () => {
        window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // This useEffect handles applying the theme. The preference is saved via AuthContext.
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleSetPreferredLanguage = (lang: PreferredLanguage) => {
    setPreferredLanguage(lang);
    updateProfilePreferences({ language: lang });
  };

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    updateProfilePreferences({ theme: newTheme });
  };

  // Effect to clean up the audio object URLs to prevent memory leaks.
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (nowPlayingUrl) {
        URL.revokeObjectURL(nowPlayingUrl);
      }
    };
  }, [audioUrl, nowPlayingUrl]);
  
  const handleCloseNowPlaying = useCallback(() => {
    if (nowPlayingUrl) {
        URL.revokeObjectURL(nowPlayingUrl);
    }
    setNowPlaying(null);
    setNowPlayingUrl(null);
  }, [nowPlayingUrl]);

  const handleReset = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
    setRawTranscript('');
    setCleanedTranscript('');
    setError(null);
    setProcessStage('idle');
    setFileInputKey(Date.now());
    setEstimatedTime(null);
    setPrecisionPotential(null);
    setInitialPrecision(null);
    setExpandedTranscript('none');
    setFileSelectionSuccess(false);
    setOutputPreference('both');
    setCurrentAudioId(null);
    setCurrentTranscriptionId(null);
    setAudioDuration(0);
    setProcessingTime(null);
    setDetectedLanguage(null);
    setIsDetectingLanguage(false);
    handleCloseNowPlaying();
    // Reset refinement state
    setIsRefineModalOpen(false);
    setIsRefining(false);
    setAdvancedTranscript('');
    setAdvancedTranscriptTitle('');
  }, [audioUrl, handleCloseNowPlaying]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        const result = reader.result as string;
        if (result && result.includes(',')) {
            const base64String = result.split(',')[1];
            resolve(base64String);
        } else {
            reject(new Error('Falha ao converter o ficheiro para Base64. Formato inválido.'));
        }
      };
      reader.onerror = () => {
        reader.abort();
        reject(new Error(`Não foi possível ler o ficheiro. Pode estar corrompido ou o navegador pode não ter permissão.`));
      };
    });
  };

  const handleFileChange = async (file: File | null) => {
    handleReset();

    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`O ficheiro excede o limite de ${MAX_FILE_SIZE_MB} MB. Por favor, escolha um ficheiro mais pequeno.`);
        setAudioFile(null);
        setAudioUrl(null);
        setFileInputKey(Date.now()); 
        return;
      }
      
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setFileSelectionSuccess(true);
      setCurrentAudioId(null); // Reset audio ID for new uploads

      // Start language detection immediately
      setIsDetectingLanguage(true);
      setDetectedLanguage(null);
      try {
          const audioBase64 = await blobToBase64(file);
          const lang = await detectLanguage(audioBase64, file.type);
          setDetectedLanguage(lang);
      } catch (err) {
          console.error('Error detecting language:', err);
          setError("Não foi possível detetar o idioma do áudio. Pode continuar, mas a transcrição pode ser menos precisa.");
          setDetectedLanguage("Indeterminate"); // Set a fallback
      } finally {
          setIsDetectingLanguage(false);
      }

      try {
        const duration = await getAudioDuration(file);
        setAudioDuration(duration); // Store numeric duration for progress calculation
        setEstimatedTime(estimateProcessingTime(duration));
        const potential = estimatePrecisionPotential(file.name);
        setPrecisionPotential(potential);
        setInitialPrecision(potential);
      } catch (err) {
        console.error('Erro ao obter metadados do áudio:', err);
        const errorMessage = 'Não foi possível ler a duração do áudio. O ficheiro pode estar corrompido ou num formato não suportado.';
        setError(`${errorMessage} As estimativas não estão disponíveis, mas ainda pode processar o ficheiro.`);
        setEstimatedTime(null);
        setPrecisionPotential(null);
        setInitialPrecision(null);
      }
    }
  };

  const handleTranscribeFromRecordings = async (audio: AudioRecording) => {
    const file = new File([audio.audioBlob], audio.name, {
      type: audio.audioBlob.type || 'audio/wav',
    });
  
    handleReset();
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setFileSelectionSuccess(true);
    setCurrentAudioId(audio.id);
    
    setIsDetectingLanguage(true);
    setDetectedLanguage(null);
    try {
        const audioBase64 = await blobToBase64(file);
        const lang = await detectLanguage(audioBase64, file.type);
        setDetectedLanguage(lang);
    } catch (err) {
        console.error('Error detecting language:', err);
        setError("Não foi possível detetar o idioma do áudio.");
        setDetectedLanguage("Indeterminate");
    } finally {
        setIsDetectingLanguage(false);
    }

    try {
        const duration = await getAudioDuration(file);
        setAudioDuration(duration);
        setEstimatedTime(estimateProcessingTime(duration));
        const potential = estimatePrecisionPotential(file.name);
        setPrecisionPotential(potential);
        setInitialPrecision(potential);
    } catch (err) {
        console.error('Erro ao obter metadados do áudio:', err);
        const errorMessage = 'Não foi possível ler a duração do áudio. O ficheiro pode estar corrompido ou num formato não suportado.';
        setError(`${errorMessage} As estimativas não estão disponíveis, mas ainda pode processar o ficheiro.`);
        setEstimatedTime(null);
        setInitialPrecision(null);
    }
  
    window.location.hash = '#/home';
  };

  const handlePlayAudio = (audio: AudioRecording) => {
    if (nowPlaying?.id === audio.id) {
        return; 
    }
    if (nowPlayingUrl) {
        URL.revokeObjectURL(nowPlayingUrl);
    }
    const url = URL.createObjectURL(audio.audioBlob);
    setNowPlaying(audio);
    setNowPlayingUrl(url);
  };

    const trialHasExpired = !!currentUser?.created_at && !isTrialActive(currentUser.created_at);
    const isFeatureLocked = currentUser?.plan === 'trial' && trialHasExpired;

  const handleProcessAudio = useCallback(async () => {
    const audioToProcess = audioFile;

    if (!audioFile || !audioToProcess || !currentUser) {
      setError('Por favor, selecione um ficheiro de áudio e inicie a sessão para processar.');
      return;
    }
    
    if (isFeatureLocked) {
        setError(
            <>
                O seu período de teste terminou. Por favor, <a href="#/plans" className="font-semibold underline hover:text-cyan-800 dark:hover:text-cyan-200">faça um upgrade</a> para continuar a transcrever.
            </>
        );
        return;
    }
    
    // Usage check logic removed from here as it's now handled by the useEffect hook and displayed in the header.
    // The Gemini API call will fail if the user is over quota, and the error will be caught.
    
    if (!detectedLanguage) {
        setError("O idioma do áudio ainda não foi detetado. Por favor, aguarde ou recarregue o ficheiro.");
        return;
    }

    handleCloseNowPlaying();
  
    const transcriptionId = `longani-job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setError(null);
    let fullRawTranscript = '';
    let finalHtml = '';
    setRawTranscript('');
    setCleanedTranscript('');

    const startTime = Date.now();
    setProcessingTime(null);
  
    try {
      let audioId = currentAudioId;
      if (!audioId) {
        const savedAudioFile = await addAudioFile({
          name: audioFile.name,
          audioBlob: audioFile,
        }, currentUser.id);
        audioId = savedAudioFile.id;
        setCurrentAudioId(savedAudioFile.id);
      } else {
        const oldTranscription = (await getAllTranscriptions()).find(t => t.audio_id === audioId);
        if (oldTranscription) {
            await deleteTranscription(oldTranscription.id);
        }
      }

      const audioBase64 = await blobToBase64(audioToProcess);
      const audioMimeType = audioToProcess.type;
  
      const BATCH_UPDATE_INTERVAL = 100;
  
      setProcessStage('transcribing');
      let lastRawUpdate = 0;
      for await (const chunk of transcribeAudio(audioBase64, audioMimeType)) {
        fullRawTranscript += chunk;
        const now = Date.now();
        if (now - lastRawUpdate > BATCH_UPDATE_INTERVAL) {
          setRawTranscript(fullRawTranscript);
          if (initialPrecision !== null) {
              const dynamicPrecision = calculateDynamicPrecision(fullRawTranscript, initialPrecision);
              setPrecisionPotential(dynamicPrecision);
          }
          lastRawUpdate = now;
        }
      }
      setRawTranscript(fullRawTranscript);
  
      if (initialPrecision !== null) {
        const dynamicPrecision = calculateDynamicPrecision(fullRawTranscript, initialPrecision);
        setPrecisionPotential(dynamicPrecision);
      }

      if (fullRawTranscript.trim()) {
        setProcessStage('cleaning');
        let cleanedHtml = '';
        const targetLanguageName = languageMap[preferredLanguage];
        for await (const chunk of cleanTranscript(fullRawTranscript, detectedLanguage, targetLanguageName)) {
          cleanedHtml += chunk;
          setCleanedTranscript(cleanedHtml);
        }
        finalHtml = cleanedHtml;
      } else {
        setCleanedTranscript('');
      }
      
      setProcessStage('completed');
      const endTime = Date.now();
      setProcessingTime(formatProcessingTime(endTime - startTime));

      if (audioFile) {
        await addTranscription({
          id: transcriptionId,
          filename: audioFile.name,
          raw_transcript: fullRawTranscript,
          cleaned_transcript: finalHtml,
          audio_id: audioId,
          user_id: currentUser.id,
          original_language: detectedLanguage,
        });
        setCurrentTranscriptionId(transcriptionId);
      }
  
    } catch (err) {
      const friendlyMessage = getFriendlyErrorMessage(err, transcriptionId);
      setError(friendlyMessage);
      setProcessStage('idle');
    }
  }, [audioFile, initialPrecision, currentAudioId, handleCloseNowPlaying, preferredLanguage, audioDuration, detectedLanguage, currentUser, isFeatureLocked]);

  const handleRefine = async (contentType: RefineContentType, outputFormat: RefineOutputFormat) => {
    if (!rawTranscript) {
      setError('Não há texto literal para refinar.');
      return;
    }

    setIsRefining(true);
    setError(null);
    setAdvancedTranscript('');
    
    setAdvancedTranscriptTitle(getRefinedTitle(contentType, outputFormat));

    let fullRefinedText = '';
    let refinementError: Error | null = null;

    try {
      for await (const chunk of refineTranscript(rawTranscript, contentType, outputFormat, preferredLanguage)) {
          fullRefinedText += chunk;
          setAdvancedTranscript(fullRefinedText);
      }
    } catch (err) {
      refinementError = err as Error;
      const friendlyMessage = getFriendlyErrorMessage(err);
      setError(`Ocorreu um erro durante o refinamento: ${friendlyMessage}`);
    } finally {
      setIsRefining(false);
      setIsRefineModalOpen(false);

      if (currentTranscriptionId && !refinementError) {
          try {
              await updateTranscription(currentTranscriptionId, {
                  refined_transcript: fullRefinedText,
                  refined_content_type: contentType,
                  refined_output_format: outputFormat,
              });
          } catch (dbError) {
              console.error("Failed to save refinement:", dbError);
              // Optionally show a non-blocking error to the user, for now logging is sufficient
          }
      }
    }
  };

  const handleToggleTranscript = (transcriptType: 'raw' | 'cleaned') => {
    setExpandedTranscript(current => (current === transcriptType ? 'none' : transcriptType));
  };

  const handleHistoryClick = (transcriptionId: string) => {
    sessionStorage.setItem('highlightTranscriptionId', transcriptionId);
    window.location.hash = '#/history';
  };

  const isProcessing = processStage === 'transcribing' || processStage === 'cleaning';
  const isAccordionMode = processStage === 'completed' && !advancedTranscript;
  const finalDisplayIsSingleColumn = (processStage === 'completed' && outputPreference !== 'both') || !!advancedTranscript;

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

    // From here, we know the user is authenticated.
    const shouldShowTrialBanner = isFeatureLocked;

    switch (page) {
      case 'profile':
        return <ProfilePage />;
      case 'history':
        return <HistoryPage />;
      case 'recordings':
        return <RecordingsPage onTranscribe={handleTranscribeFromRecordings} onPlayAudio={handlePlayAudio} />;
      case 'favorites':
        return <FavoritesPage onTranscribe={handleTranscribeFromRecordings} onPlayAudio={handlePlayAudio} />;
      case 'teams':
        const canAccessTeams = currentUser?.plan === 'ideal' || currentUser?.plan === 'premium' || (currentUser?.plan === 'trial' && !trialHasExpired);
        if (!canAccessTeams) {
            return <FeatureLockedPage featureName="Equipas" requiredPlan="Ideal ou superior" />;
        }
        return <TeamsPage />;
      case 'translations':
        return <TranslationsPage />;
      case 'plans':
        return <PlansPage />;
      case 'home':
      default:
        const recentHistorySection = (
            <div className="w-full mt-12 animate-fade-in">
              <div className="max-w-3xl mx-auto">
                <h4 className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Histórico Recente</h4>
                {recentTranscriptions.length > 0 ? (
                    <ul className="divide-y divide-gray-200/60 dark:divide-gray-700/60">
                        {recentTranscriptions.map(t => (
                            <li key={t.id}>
                                <button onClick={() => handleHistoryClick(t.id)} className="w-full text-left flex justify-between items-center py-3 hover:bg-gray-500/10 rounded-md transition-colors -mx-2 px-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate pr-4" title={t.filename}>{t.filename}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                        {new Date(t.created_at).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma transcrição recente encontrada.</p>
                    </div>
                )}
              </div>
            </div>
        );
        return (
          <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col">
            {shouldShowTrialBanner && (
                <div className="max-w-3xl mx-auto w-full p-4 mb-6 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg border border-yellow-200 dark:border-yellow-800/60 text-center animate-fade-in">
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                        O seu período de teste gratuito terminou.
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        Para continuar a transcrever e usar todas as funcionalidades, por favor, escolha um plano.
                    </p>
                    <a href="#/plans" className="inline-block mt-3 px-4 py-1.5 text-sm font-bold text-white bg-[#24a9c5] rounded-full hover:bg-[#1e8a9f] transition-colors">
                        Ver Planos
                    </a>
                </div>
            )}
            {!audioFile && (
              <div className="flex-grow flex flex-col justify-between">
                <div> {/* Wrapper for top content */}
                    <div className="flex-grow flex flex-col justify-center items-center">
                        <div className="max-w-3xl mx-auto w-full bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                            <FileUpload key={fileInputKey} onFileChange={handleFileChange} disabled={isProcessing} fileSelected={fileSelectionSuccess} />
                            <GoogleDrivePicker onFileImported={handleFileChange} />
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-4 text-center">
                            Ficheiros de áudio suportados (.mp3, .wav, .m4a, etc.) com um limite de {MAX_FILE_SIZE_MB}MB.
                          </p>
                          {preferredLanguage !== 'pt' && (
                              <div className="text-center text-sm text-cyan-700 dark:text-cyan-400 mt-4 bg-cyan-50 dark:bg-cyan-900/30 p-3 rounded-lg border border-cyan-100 dark:border-cyan-800">
                                  <InfoIcon className="w-4 h-4 inline-block mr-2 align-middle" />
                                  <span className="align-middle">Nota: O texto formatado final será entregue em <strong>{languageMap[preferredLanguage]}</strong>.</span>
                              </div>
                          )}
                        </div>
                        <div className="my-4 flex items-center w-full max-w-xs text-center" aria-hidden="true">
                            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                            <span className="flex-shrink mx-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Ou</span>
                            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                        </div>
                        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                            Pode <button onClick={() => window.location.hash = '#/recordings'} className="font-medium text-[#24a9c5] hover:underline focus:outline-none focus:ring-1 focus:ring-[#24a9c5] rounded">gravar um áudio</button>.
                        </div>
                    </div>
                </div>
                {/* Bottom part */}
                {recentHistorySection}
              </div>
            )}

            {audioFile && processStage === 'idle' && (
              <div className="max-w-5xl mx-auto animate-fade-in-up w-full">
                <div className="lg:grid lg:grid-cols-5 lg:gap-8 items-start">
                    <div className="lg:col-span-3">
                        <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                            <h2 className="text-xl font-bold text-center text-gray-800 dark:text-gray-200 mb-4">Ficheiro Pronto a Processar</h2>
                            <p className="text-center text-gray-600 dark:text-gray-400 break-words mb-4">{audioFile.name}</p>
                            {audioUrl && (
                              <CustomAudioPlayer src={audioUrl} />
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-2 mt-6 lg:mt-0">
                       <div className="text-left p-4 bg-white/60 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 rounded-lg shadow-lg">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {estimatedTime && (
                                  <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                      <ClockIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                                      <div>
                                          <p className="font-semibold">Tempo Estimado</p>
                                          <p className="text-gray-600 dark:text-gray-400">{estimatedTime}</p>
                                      </div>
                                  </div>
                              )}
                              {precisionPotential !== null && (
                                 <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                     <TargetIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                                     <div>
                                         <p className="font-semibold">Potencial de Precisão</p>
                                         <p className="text-gray-600 dark:text-gray-400">{precisionPotential}%</p>
                                     </div>
                                 </div>
                              )}
                               <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                  <TranslateIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                                  <div>
                                      <p className="font-semibold">Idioma Detetado</p>
                                      {isDetectingLanguage ? (
                                          <div className="flex items-center gap-2">
                                              <Loader className="w-4 h-4 text-gray-400" />
                                              <span className="text-gray-500 dark:text-gray-400 text-xs">A analisar...</span>
                                          </div>
                                      ) : (
                                          <p className="text-gray-600 dark:text-gray-400">{translateLanguageName(detectedLanguage)}</p>
                                      )}
                                  </div>
                              </div>
                          </div>
                           <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                              <ColumnsIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                              <div>
                                <p id="output-preference-label" className="font-semibold mb-2">Visualização do Resultado</p>
                                <div role="radiogroup" aria-labelledby="output-preference-label" className="flex flex-wrap gap-2">
                                  <button role="radio" aria-checked={outputPreference === 'both'} onClick={() => setOutputPreference('both')} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${outputPreference === 'both' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>Ambos</button>
                                  <button role="radio" aria-checked={outputPreference === 'raw'} onClick={() => setOutputPreference('raw')} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${outputPreference === 'raw' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>Apenas Literal</button>
                                  <button role="radio" aria-checked={outputPreference === 'cleaned'} onClick={() => setOutputPreference('cleaned')} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${outputPreference === 'cleaned' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>Apenas Formatado</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex flex-col gap-3 items-center justify-center">
                  <button onClick={handleProcessAudio} disabled={isProcessing || isDetectingLanguage} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#24a9c5] text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:bg-[#1e8a9f] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105">
                    <ArrowRightIcon className="w-5 h-5" />
                    <span>Iniciar Processo</span>
                  </button>
                  <button onClick={handleReset} className="text-sm text-gray-500 dark:text-gray-400 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] dark:focus:ring-offset-gray-900 rounded-md p-1">
                    Substituir Áudio
                  </button>
                </div>
              </div>
            )}
            
            {error && <div className="text-center text-red-800 bg-red-100 p-3 my-4 rounded-lg border border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800/50">{error}</div>}

            {processStage !== 'idle' && (
              <div className="mt-6 max-w-3xl mx-auto w-full">
                <div className="mb-6 p-4 bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        {processStage === 'completed' ? 'Ficheiro Processado:' : 'A processar o ficheiro:'}
                      </p>
                      {isProcessing ? (
                          <div className="relative w-full flex overflow-x-hidden h-7 items-center">
                              <div className="animate-marquee whitespace-nowrap flex items-center">
                                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200 px-4">
                                      {audioFile?.name}
                                  </p>
                              </div>
                              <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center h-full">
                                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200 px-4">
                                      {audioFile?.name}
                                  </p>
                              </div>
                          </div>
                      ) : (
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200 truncate px-4">
                              {audioFile?.name}
                          </p>
                      )}
                    </div>
                    {processStage === 'completed' && audioUrl ? (
                      <>
                        <div className="mt-4">
                          <CustomAudioPlayer src={audioUrl} />
                        </div>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            {processingTime && (
                                <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                                    <ClockIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                                    <div>
                                        <p className="font-semibold">Tempo de Processamento</p>

                                        <p className="text-gray-600 dark:text-gray-400">{processingTime}</p>
                                    </div>
                                </div>
                            )}
                            {precisionPotential !== null && (
                                <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                                    <TargetIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                                    <div>
                                        <p className="font-semibold">Precisão Final Atingida</p>
                                        <p className="text-gray-600 dark:text-gray-400">{precisionPotential}%</p>
                                    </div>
                                </div>
                            )}
                             {detectedLanguage && (
                                <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                                    <TranslateIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" />
                                    <div>
                                        <p className="font-semibold">Idioma Original</p>
                                        <p className="text-gray-600 dark:text-gray-400">{translateLanguageName(detectedLanguage)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                      </>
                    ) : (
                      <div className="mt-2 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          {estimatedTime && (
                              <span className="flex items-center gap-1">
                                  <ClockIcon className="w-4 h-4" />
                                  <span>Tempo Est.: {estimatedTime}</span>
                              </span>
                          )}
                          {precisionPotential !== null && (
                              <span className="flex items-center gap-1">
                                  <TargetIcon className="w-4 h-4" />
                                  <span>Potencial: {precisionPotential}%</span>
                              </span>
                          )}
                           {isDetectingLanguage && (
                               <span className="flex items-center gap-1">
                                    <Loader className="w-3 h-3"/>
                                    <span>A detetar idioma...</span>
                               </span>
                           )}
                           {detectedLanguage && !isDetectingLanguage && (
                               <span className="flex items-center gap-1">
                                    <TranslateIcon className="w-4 h-4" />
                                    <span>{translateLanguageName(detectedLanguage)}</span>
                               </span>
                           )}
                      </div>
                    )}
                </div>
                <ProgressBar stage={processStage} />
              </div>
            )}
            
            {(rawTranscript || cleanedTranscript || isProcessing || advancedTranscript || isRefining) && (
                <div className={`mt-12 grid grid-cols-1 ${!advancedTranscript && !isRefining && (finalDisplayIsSingleColumn ? 'lg:grid-cols-1' : 'lg:grid-cols-2')} gap-8`}>
                    {(isProcessing || (processStage === 'completed' && (outputPreference === 'raw' || outputPreference === 'both'))) && <TranscriptDisplay 
                        title="Texto Literal"
                        text={rawTranscript}
                        isLoading={processStage === 'transcribing'}
                        isComplete={processStage !== 'transcribing' && rawTranscript.length > 0}
                        isExpanded={!isAccordionMode || expandedTranscript === 'raw'}
                        isClickable={isAccordionMode}
                        onToggle={() => handleToggleTranscript('raw')}
                    />}
                    {(isProcessing || (processStage === 'completed' && (outputPreference === 'cleaned' || outputPreference === 'both'))) && <TranscriptDisplay 
                        title={`Texto Formatado (${languageMap[preferredLanguage]})`}
                        text={cleanedTranscript}
                        isLoading={processStage === 'cleaning'}
                        isComplete={processStage === 'completed' && cleanedTranscript.length > 0}
                        placeholder={processStage === 'cleaning' || processStage === 'completed' ? "A aguardar pela otimização..." : "O resultado aparecerá aqui."}
                        renderAsHTML={true}
                        isExpanded={!isAccordionMode || expandedTranscript === 'cleaned'}
                        isClickable={isAccordionMode}
                        onToggle={() => handleToggleTranscript('cleaned')}
                    />}
                     {(advancedTranscript || isRefining) && (
                        <TranscriptDisplay 
                            title={advancedTranscriptTitle || 'Documento Refinado'}
                            text={advancedTranscript}
                            isLoading={isRefining}
                            isComplete={!isRefining && advancedTranscript.length > 0}
                            placeholder="O resultado do refinamento aparecerá aqui."
                            renderAsHTML={true}
                            isExpanded={true}
                            isClickable={false}
                            onToggle={() => {}}
                        />
                    )}
                </div>
            )}

            {processStage === 'completed' && (
                <div className="mt-12 text-center animate-fade-in-up">
                    <button
                        onClick={handleReset}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#24a9c5] text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:bg-[#1e8a9f] transition-all"
                    >
                        <ReloadIcon className="w-5 h-5" />
                        <span>Transcrever Novo Ficheiro</span>
                    </button>
                    <div className="mt-4">
                        <button
                            onClick={() => {
                                if (isFeatureLocked) {
                                    setError(<>O seu período de teste terminou. Por favor, <a href="#/plans" className="font-semibold underline hover:text-cyan-800 dark:hover:text-cyan-200">faça um upgrade</a> para aceder a esta funcionalidade.</>);
                                    window.scrollTo(0, 0);
                                    return;
                                }
                                
                                const canAccessPremium = currentUser?.plan === 'premium' || (currentUser?.plan === 'trial' && !trialHasExpired);

                                if (!canAccessPremium) {
                                    setError(
                                        <>
                                            O Refinamento Avançado é uma funcionalidade exclusiva do plano Premium. <a href="#/plans" className="font-semibold underline hover:text-cyan-800 dark:hover:text-cyan-200">Faça um upgrade</a> para aceder.
                                        </>
                                    );
                                    window.scrollTo(0, 0);
                                } else {
                                    setIsRefineModalOpen(true);
                                }
                            }}
                            className="font-bold text-[#24a9c5] hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] dark:focus:ring-offset-gray-900 rounded-md p-1"
                        >
                            ou faça um Refinamento Avançado
                        </button>
                    </div>
                </div>
            )}
          </main>
        );
    }
  };
  
  if (showDesktopLock) {
    return <DesktopNotice />;
  }

  return (
    <>
      <div className={`min-h-screen flex flex-col transition-opacity duration-500 ease-in-out ${isAppVisible ? 'opacity-100' : 'opacity-0'} ${nowPlaying ? 'pb-24 sm:pb-20' : ''}`}>
        {session && currentUser && (
          <Header 
            page={page} 
            theme={theme} 
            setTheme={handleSetTheme} 
            preferredLanguage={preferredLanguage} 
            setPreferredLanguage={handleSetPreferredLanguage}
            currentUser={currentUser}
            onLogout={signOut}
            onSearchClick={() => setIsSearchOpen(true)}
            onHomeReset={handleReset}
            monthlyUsage={monthlyUsage}
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
          onClose={handleCloseNowPlaying} 
        />
      )}
       <RefineModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        onSubmit={handleRefine}
        isRefining={isRefining}
      />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default App;