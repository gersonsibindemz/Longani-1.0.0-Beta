import React, { useState, useCallback, useEffect, useRef } from 'react';
import { transcribeAudio, cleanTranscript, translateText, refineTranscript } from './services/geminiService';
import { Header, longaniLogoUrl } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { ProgressBar } from './components/ProgressBar';
import { Loader } from './components/Loader';
import { ArrowRightIcon, ReloadIcon, ClockIcon, TargetIcon, InfoIcon, HistoryIcon, ColumnsIcon, SparkleIcon } from './components/Icons';
import { getAudioDuration, estimateProcessingTime, estimatePrecisionPotential, calculateDynamicPrecision, getFriendlyErrorMessage, getNumericProcessingTimeEstimate, formatProcessingTime } from './utils/audioUtils';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { HistoryPage } from './components/HistoryPage';
import { RecordingsPage } from './components/RecordingsPage';
// FIX: Imported the `updateTranscription` function to allow saving refined transcription data to the database.
import { addTranscription, addAudioFile, AudioRecording, getAllTranscriptions, Transcription, getTranscriptionById, getAudioFile, updateTranscription, deleteTranscription } from './utils/db';
import { NowPlayingBar } from './components/NowPlayingBar';
import { FavoritesPage } from './components/FavoritesPage';
import { TranslationsPage } from './components/TranslationsPage';
import { CustomAudioPlayer } from './components/CustomAudioPlayer';
import { LoginPage } from './components/LoginPage';
import { RefineModal } from './components/RefineModal';
import type { RefineContentType, RefineOutputFormat } from './services/geminiService';
import { SignUpPage } from './components/SignUpPage';

type ProcessStage = 'idle' | 'transcribing' | 'cleaning' | 'completed';
export type Theme = 'light' | 'dark';
export type PreferredLanguage = 'pt' | 'en' | 'sn';

type ExpandedTranscript = 'raw' | 'cleaned' | 'none';
type OutputPreference = 'both' | 'raw' | 'cleaned';

const languageMap: { [key in PreferredLanguage]: string } = {
  pt: 'Português',
  en: 'Inglês',
  sn: 'Shona'
};

const contentLabels: { [key in RefineContentType]: string } = {
    'meeting': 'Reunião',
    'sermon': 'Sermão',
    'interview': 'Entrevista',
    'lecture': 'Palestra',
    'note': 'Nota Pessoal',
};

const formatLabels: { [key in RefineOutputFormat]: string } = {
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

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [cleanedTranscript, setCleanedTranscript] = useState<string>('');
  const [processStage, setProcessStage] = useState<ProcessStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [precisionPotential, setPrecisionPotential] = useState<number | null>(null);
  const [initialPrecision, setInitialPrecision] = useState<number | null>(null);
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>('pt');
  const [isPWA, setIsPWA] = useState(false);
  const [expandedTranscript, setExpandedTranscript] = useState<ExpandedTranscript>('none');
  const [fileSelectionSuccess, setFileSelectionSuccess] = useState(false);
  const [outputPreference, setOutputPreference] = useState<OutputPreference>('both');
  const [page, setPage] = useState<string>(getCurrentPage());
  const [nowPlaying, setNowPlaying] = useState<AudioRecording | null>(null);
  const [nowPlayingUrl, setNowPlayingUrl] = useState<string | null>(null);
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  const [currentTranscriptionId, setCurrentTranscriptionId] = useState<string | null>(null);
  const [recentTranscriptions, setRecentTranscriptions] = useState<Transcription[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // State for real-time progress and final stats
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [processingTime, setProcessingTime] = useState<string | null>(null);

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
        if (transcription.audioId) {
            audioForPlayer = await getAudioFile(transcription.audioId);
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
            } catch {
                // Ignore duration errors on reload
            }
        }

        setRawTranscript(transcription.rawTranscript);
        setCleanedTranscript(transcription.cleanedTranscript);
        if (transcription.refinedTranscript && transcription.refinedContentType && transcription.refinedOutputFormat) {
            setAdvancedTranscript(transcription.refinedTranscript);
            setAdvancedTranscriptTitle(getRefinedTitle(transcription.refinedContentType, transcription.refinedOutputFormat));
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

  // This useEffect runs once on mount to detect PWA, load theme, and handle initial loading animation.
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        setCurrentUser(savedUser);
    }

    const pwaQuery = window.matchMedia('(display-mode: standalone)');
    if (pwaQuery.matches) {
      setIsPWA(true);
      const storedTheme = localStorage.getItem('theme') as Theme | null;
      if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
        setTheme(storedTheme);
      }
      const storedLanguage = localStorage.getItem('preferredLanguage') as PreferredLanguage | null;
      if (storedLanguage && ['pt', 'en', 'sn'].includes(storedLanguage)) {
        setPreferredLanguage(storedLanguage);
      }
      // For PWA, show the app immediately without a video splash screen.
      setIsAppVisible(true);
    } else {
      // For non-PWA, use image preloading.
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
    }
  }, []);

  // This useEffect handles applying the theme and saving the preference.
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    if (isPWA) {
      try {
        localStorage.setItem('theme', theme);
      } catch (e) {
        console.warn('Não foi possível guardar o tema no localStorage:', e);
      }
    }
  }, [theme, isPWA]);

  const handleSetPreferredLanguage = (lang: PreferredLanguage) => {
    setPreferredLanguage(lang);
    try {
        localStorage.setItem('preferredLanguage', lang);
    } catch (e) {
        console.warn('Não foi possível guardar o idioma no localStorage:', e);
    }
  };

  useEffect(() => {
    // This feature is only for installed PWAs on mobile-like devices where a back button closes the app
    if (isPWA) {
        let allowExit = false;
        // Use ReturnType<typeof setTimeout> for cross-environment compatibility of timer IDs.
        let exitTimer: ReturnType<typeof setTimeout> | null = null;

        const handleBackButton = (event: PopStateEvent) => {
            if (!allowExit) {
                // Prevent exit on first press
                history.pushState(null, '', location.href);

                setShowExitToast(true);
                allowExit = true;

                if (exitTimer) clearTimeout(exitTimer);
                exitTimer = setTimeout(() => {
                    setShowExitToast(false);
                    allowExit = false;
                }, 2000); // 2-second window to press back again
            }
            // On second press, allowExit is true, so we do nothing, letting the back navigation proceed.
        };
        
        // Push an initial state to be able to intercept the first back press
        history.pushState(null, '', location.href);
        window.addEventListener('popstate', handleBackButton);

        return () => {
            window.removeEventListener('popstate', handleBackButton);
            if (exitTimer) clearTimeout(exitTimer);
        };
    }
  }, [isPWA]);

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
    handleCloseNowPlaying();
    // Reset refinement state
    setIsRefineModalOpen(false);
    setIsRefining(false);
    setAdvancedTranscript('');
    setAdvancedTranscriptTitle('');
  }, [audioUrl, handleCloseNowPlaying]);

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
    // Create a File object from the Blob
    const file = new File([audio.audioBlob], audio.name, {
      type: audio.audioBlob.type || 'audio/wav', // Provide a default MIME type
    });
  
    // Use a modified file change handler to set up the app state AND the audio ID
    handleReset();
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setFileSelectionSuccess(true);
    setCurrentAudioId(audio.id); // IMPORTANT: Link this job to the existing audio file

    try {
        const duration = await getAudioDuration(file);
        setAudioDuration(duration);
        setEstimatedTime(estimateProcessingTime(duration));
        const potential = estimatePrecisionPotential(file.name);
        setPrecisionPotential(potential);
        setInitialPrecision(potential);
    } catch (err) {
        // Error handling from the original handleFileChange
        console.error('Erro ao obter metadados do áudio:', err);
        const errorMessage = 'Não foi possível ler a duração do áudio. O ficheiro pode estar corrompido ou num formato não suportado.';
        setError(`${errorMessage} As estimativas não estão disponíveis, mas ainda pode processar o ficheiro.`);
        setEstimatedTime(null);
        setInitialPrecision(null);
    }
  
    // Navigate to the home page
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

  const handleProcessAudio = useCallback(async () => {
    const audioToProcess = audioFile;

    if (!audioFile || !audioToProcess) {
      setError('Por favor, selecione um ficheiro de áudio para processar.');
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
        const newAudioFile = {
          id: `audio-${Date.now()}-${audioFile.name}`,
          name: audioFile.name,
          date: Date.now(),
          type: 'upload' as const,
          audioBlob: audioFile,
          isFavorite: false,
        };
        await addAudioFile(newAudioFile);
        audioId = newAudioFile.id;
      } else {
        // This is an existing audio file. Check for and delete any old transcription
        // associated with it before creating a new one.
        const oldTranscription = (await getAllTranscriptions()).find(t => t.audioId === audioId);
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
        for await (const chunk of cleanTranscript(fullRawTranscript)) {
          cleanedHtml += chunk;
          if (preferredLanguage === 'pt') {
            setCleanedTranscript(cleanedHtml);
          }
        }
        finalHtml = cleanedHtml;

        if (preferredLanguage !== 'pt' && cleanedHtml.trim()) {
          if (preferredLanguage === 'en' || preferredLanguage === 'sn') {
            let translatedHtml = '';
            for await (const chunk of translateText(cleanedHtml, preferredLanguage)) {
                translatedHtml += chunk;
                setCleanedTranscript(translatedHtml);
            }
            finalHtml = translatedHtml;
          }
        }
        setCleanedTranscript(finalHtml);
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
          date: Date.now(),
          rawTranscript: fullRawTranscript,
          cleanedTranscript: finalHtml,
          audioId: audioId,
          isFavorite: false,
        });
        setCurrentTranscriptionId(transcriptionId);
      }
  
    } catch (err) {
      const friendlyMessage = getFriendlyErrorMessage(err, transcriptionId);
      setError(friendlyMessage);
      setProcessStage('idle');
    }
  }, [audioFile, initialPrecision, currentAudioId, handleCloseNowPlaying, preferredLanguage, audioDuration]);

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
                  refinedTranscript: fullRefinedText,
                  refinedContentType: contentType,
                  refinedOutputFormat: outputFormat,
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

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('currentUser', username);
    window.location.hash = '#/home';
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    window.location.hash = '#/home';
  };
  
  const isProcessing = processStage === 'transcribing' || processStage === 'cleaning';
  const isAccordionMode = processStage === 'completed' && !advancedTranscript;
  const finalDisplayIsSingleColumn = (processStage === 'completed' && outputPreference !== 'both') || !!advancedTranscript;

  const renderPage = () => {
    switch (page) {
      case 'login':
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
      case 'signup':
        return <SignUpPage onSignUpSuccess={handleLoginSuccess} />;
      case 'history':
        return <HistoryPage />;
      case 'recordings':
        return <RecordingsPage onTranscribe={handleTranscribeFromRecordings} onPlayAudio={handlePlayAudio} />;
      case 'favorites':
        return <FavoritesPage onTranscribe={handleTranscribeFromRecordings} onPlayAudio={handlePlayAudio} />;
      case 'translations':
        return <TranslationsPage />;
      case 'home':
      default:
        const recentHistorySection = (
            <div className="w-full mt-8 lg:mt-0 animate-fade-in">
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                <h4 className="text-left text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Histórico Recente</h4>
                {recentTranscriptions.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recentTranscriptions.map(t => (
                            <li key={t.id}>
                                <button onClick={() => handleHistoryClick(t.id)} className="w-full text-left flex justify-between items-center py-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/20 rounded-md transition-colors -mx-2 px-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate pr-4" title={t.filename}>{t.filename}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                        {new Date(t.date).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
            {!audioFile && (
              <div className="flex-grow lg:grid lg:grid-cols-3 lg:gap-12 lg:items-start">
                <div className="lg:col-span-2 flex-grow flex flex-col justify-center h-full">
                    <div className="flex-grow flex flex-col justify-center items-center">
                        <div className="max-w-3xl mx-auto w-full bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                            <FileUpload key={fileInputKey} onFileChange={handleFileChange} disabled={isProcessing} fileSelected={fileSelectionSuccess} />
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-4 text-center">
                            Ficheiros de áudio suportados (.mp3, .wav, .m4a, etc.) com um limite de {MAX_FILE_SIZE_MB}MB.
                          </p>
                          {preferredLanguage !== 'pt' && (
                              <div className="text-center text-sm text-cyan-700 dark:text-cyan-400 mt-4 bg-cyan-50 dark:bg-cyan-900/30 p-3 rounded-lg border border-cyan-100 dark:border-cyan-800">
                                  <InfoIcon className="w-4 h-4 inline-block mr-2 align-middle" />
                                  <span className="align-middle">Nota: A transcrição final será entregue em <strong>{languageMap[preferredLanguage]}</strong>.</span>
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
                <aside className="lg:col-span-1 lg:sticky lg:top-24">
                  {recentHistorySection}
                </aside>
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
                  <button onClick={handleProcessAudio} disabled={isProcessing} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#24a9c5] text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:bg-[#1e8a9f] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105">
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
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                        title="Texto Formatado"
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
                            onClick={() => setIsRefineModalOpen(true)}
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

  return (
    <>
      <div className={`min-h-screen flex flex-col transition-opacity duration-500 ease-in-out ${isAppVisible ? 'opacity-100' : 'opacity-0'} ${nowPlaying ? 'pb-24 sm:pb-20' : ''}`}>
        {page !== 'login' && page !== 'signup' && (
          <Header 
            page={page} 
            theme={theme} 
            setTheme={setTheme} 
            preferredLanguage={preferredLanguage} 
            setPreferredLanguage={handleSetPreferredLanguage}
            currentUser={currentUser}
            onLogout={handleLogout}
          />
        )}
        {renderPage()}
        {page !== 'login' && page !== 'signup' && (
            <footer className="hidden sm:block text-center py-6 text-gray-500 dark:text-gray-400 text-sm select-none">
                <p>
                    © {new Date().getFullYear()} Longani &middot; v0.9.2
                </p>
            </footer>
        )}
      </div>
      {nowPlaying && nowPlayingUrl && page !== 'login' && page !== 'signup' && (
        <NowPlayingBar 
          audio={nowPlaying} 
          audioUrl={nowPlayingUrl} 
          onClose={handleCloseNowPlaying} 
        />
      )}
      {showExitToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-4 py-2 rounded-full text-sm shadow-lg select-none z-[100] animate-fade-in-up"
          >
            Pressione novamente para sair
          </div>
      )}
      {isPWA && page !== 'login' && page !== 'signup' && <ThemeSwitcher setTheme={setTheme} isEffectivelyDark={isEffectivelyDark} />}
       <RefineModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        onSubmit={handleRefine}
        isRefining={isRefining}
      />
    </>
  );
};

export default App;