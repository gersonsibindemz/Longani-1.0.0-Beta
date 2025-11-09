import React, { useState, useCallback, useMemo } from 'react';
// Fix: Correctly import types, moving Refine types to geminiService import.
import type { TranscriptionState, TranscriptionAction, PreferredLanguage } from '../types';
import { FileUpload } from './FileUpload';
import { GoogleDrivePicker } from './GoogleDrivePicker';
import { CustomAudioPlayer } from './CustomAudioPlayer';
import { Loader } from './Loader';
import { ArrowRightIcon, CheckIcon, ClockIcon, ColumnsIcon, InfoIcon, ReloadIcon, SaveIcon, SparkleIcon, TargetIcon, TranslateIcon } from './Icons';
import { ProgressBar } from './ProgressBar';
import { TranscriptDisplay } from './TranscriptDisplay';
import { RefineModal } from './RefineModal';
// Fix: Import TRIAL_MAX_FILES constant.
import { getAudioDuration, estimateProcessingTime, estimatePrecisionPotential, translateLanguageName, getFriendlyErrorMessage, formatProcessingTime, TRIAL_MAX_FILE_SIZE_MB, TRIAL_MAX_DURATION_SECONDS, TRIAL_MAX_FILES } from '../utils/audioUtils';
// Fix: Import Refine types from their source.
import { detectLanguage, transcribeAudio, cleanTranscript, refineTranscript, type RefineContentType, type RefineOutputFormat } from '../services/geminiService';
import { addTranscription, updateTranscription, getTranscriptionById, addAudioFile } from '../utils/db';
import { useAuth } from '../contexts/AuthContext';

interface TranscriptionWorkspaceProps {
  state: TranscriptionState;
  dispatch: React.Dispatch<TranscriptionAction>;
  userStatus: {
      isTrialActive: boolean;
      trialDaysRemaining: number;
      isTrialExpired: boolean;
      isUsageLocked: boolean;
      isTrialUploadsLocked: boolean;
      isFeatureLocked: boolean;
      canAccessPremium: boolean;
      trialUsageCount: number;
      plan: string;
  };
  recentHistorySection: React.ReactNode;
  onFileReady: () => void;
}

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
    if (!contentType || !outputFormat) return 'Documento Refinado';
    const contentLabel = contentLabels[contentType as RefineContentType] || 'Conteúdo';
    const formatLabel = formatLabels[outputFormat as RefineOutputFormat] || 'Documento';
    return `${formatLabel} (${contentLabel})`;
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

const uploadAndLinkAudio = async (transcriptionId: string, audioFile: File, userId: string) => {
    try {
      const savedAudioFile = await addAudioFile({
        name: audioFile.name,
        audioBlob: audioFile,
      }, userId);
  
      await updateTranscription(transcriptionId, { audio_id: savedAudioFile.id });
    } catch (err) {
      console.error("Background audio upload/linking failed:", getFriendlyErrorMessage(err));
      try {
        const existingTranscription = await getTranscriptionById(transcriptionId);
        if (existingTranscription) {
            await updateTranscription(transcriptionId, {
                cleaned_transcript: `<p><strong>FALHA NO UPLOAD DO ÁUDIO:</strong> O ficheiro de áudio original não pôde ser guardado. A transcrição de texto foi guardada com sucesso.</p>${existingTranscription.cleaned_transcript || ''}`
            });
        }
      } catch (updateErr) {
          console.error("Failed to update transcription with upload error message:", updateErr);
      }
    }
};


export const TranscriptionWorkspace: React.FC<TranscriptionWorkspaceProps> = ({ state, dispatch, userStatus, recentHistorySection, onFileReady }) => {
    const { profile } = useAuth();
    const [fileInputKey, setFileInputKey] = useState<number>(Date.now());
    const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);

    const {
        audioFile, processStage, error, estimatedTime, precisionPotential, isDetectingLanguage,
        detectedLanguage, outputPreference, rawTranscript, cleanedTranscript, advancedTranscript,
        advancedTranscriptTitle, isRefining, currentTranscriptionId, isSaving
    } = state;

    const {
        isFeatureLocked, isTrialExpired, isTrialUploadsLocked, isUsageLocked,
        trialUsageCount, canAccessPremium, plan
    } = userStatus;

    const preferredLanguage = (profile?.preferences as any)?.language || 'pt';

    const isTrialPlan = plan === 'trial';
    const MAX_FILE_SIZE_MB = isTrialPlan ? TRIAL_MAX_FILE_SIZE_MB : 100;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    const handleReset = useCallback(() => {
        dispatch({ type: 'RESET' });
        setFileInputKey(Date.now());
    }, [dispatch]);

    const handleFileChange = async (file: File | null) => {
        dispatch({ type: 'RESET' });
    
        if (file) {
            onFileReady();

            if (isTrialUploadsLocked) {
                dispatch({ type: 'FILE_ERROR', payload: { error: `Atingiu o limite de ${TRIAL_MAX_FILES} ficheiros para o plano Trial. Faça um upgrade para continuar.` }});
                setFileInputKey(Date.now());
                return;
            }
          if (file.size > MAX_FILE_SIZE_BYTES) {
            dispatch({ type: 'FILE_ERROR', payload: { error: `O ficheiro excede o limite de ${MAX_FILE_SIZE_MB} MB. Por favor, escolha um ficheiro mais pequeno.` }});
            setFileInputKey(Date.now()); 
            return;
          }

          dispatch({ type: 'START_LANGUAGE_DETECTION' });
          try {
              const audioBase64 = await blobToBase64(file);
              const lang = await detectLanguage(audioBase64, file.type);
              dispatch({ type: 'SET_LANGUAGE', payload: { language: lang } });
          } catch (err) {
              console.error('Error detecting language:', err);
              dispatch({ type: 'SET_LANGUAGE', payload: { language: 'Indeterminate', error: "Não foi possível detetar o idioma do áudio. Pode continuar, mas a transcrição pode ser menos precisa." }});
          }
    
          try {
            const duration = await getAudioDuration(file);
            if (isTrialPlan && duration > TRIAL_MAX_DURATION_SECONDS) {
                dispatch({ type: 'FILE_ERROR', payload: { error: `O ficheiro excede o limite de ${TRIAL_MAX_DURATION_SECONDS / 60} minutos de duração para o plano Trial.` }});
                setFileInputKey(Date.now());
                return;
            }
            const url = URL.createObjectURL(file);
            const estimatedTime = estimateProcessingTime(duration);
            const precision = estimatePrecisionPotential(file.name);
            dispatch({ type: 'SET_FILE', payload: { file, url, duration, estimatedTime, precision } });

          } catch (err) {
            console.error('Erro ao obter metadados do áudio:', err);
            const errorMessage = 'Não foi possível ler a duração do áudio. O ficheiro pode estar corrompido ou num formato não suportado.';
            dispatch({ type: 'FILE_ERROR', payload: { error: `${errorMessage} As estimativas não estão disponíveis, mas ainda pode processar o ficheiro.` } });
          }
        }
    };
    
    const handleProcessAudio = useCallback(async () => {
        if (!audioFile || !profile) {
          dispatch({ type: 'PROCESSING_ERROR', payload: { error: 'Por favor, selecione um ficheiro de áudio e inicie a sessão para processar.' }});
          return;
        }
        
        if (isFeatureLocked) {
            let lockMessage;
            if (isTrialExpired) lockMessage = <>O seu período de teste terminou. Para continuar a transcrever, é necessário fazer um upgrade.</>;
            else if (isTrialUploadsLocked) lockMessage = <>Atingiu o limite de {TRIAL_MAX_FILES} ficheiros do seu plano Trial. Para continuar a transcrever, faça um upgrade.</>;
            else lockMessage = <>O seu limite de utilização mensal foi atingido. Para obter mais tempo de transcrição, faça um upgrade ou aguarde pelo próximo ciclo.</>;
            dispatch({ type: 'PROCESSING_ERROR', payload: { error: lockMessage } });
            return;
        }
        
        if (!detectedLanguage) {
            dispatch({ type: 'PROCESSING_ERROR', payload: { error: "O idioma do áudio ainda não foi detetado. Por favor, aguarde ou recarregue o ficheiro." } });
            return;
        }
    
        dispatch({ type: 'START_PROCESSING' });
        const startTime = Date.now();
      
        try {
          const audioBase64 = await blobToBase64(audioFile);
          const audioMimeType = audioFile.type;
      
          let fullRawTranscript = '';
          for await (const chunk of transcribeAudio(audioBase64, audioMimeType)) {
            dispatch({ type: 'UPDATE_RAW_TRANSCRIPT', payload: { chunk } });
            fullRawTranscript += chunk;
          }
          dispatch({ type: 'FINALIZE_RAW_TRANSCRIPT', payload: { transcript: fullRawTranscript } });
    
          if (fullRawTranscript.trim()) {
            let finalHtml = '';
            const targetLanguageName = languageMap[preferredLanguage];
            for await (const chunk of cleanTranscript(fullRawTranscript, detectedLanguage, targetLanguageName)) {
              dispatch({ type: 'UPDATE_CLEANED_TRANSCRIPT', payload: { chunk } });
              finalHtml += chunk;
            }
            dispatch({ type: 'FINALIZE_CLEANED_TRANSCRIPT', payload: { transcript: finalHtml } });
          } else {
            dispatch({ type: 'FINALIZE_CLEANED_TRANSCRIPT', payload: { transcript: '' } });
          }
          
          const endTime = Date.now();
          dispatch({ type: 'COMPLETE_PROCESSING', payload: { time: formatProcessingTime(endTime - startTime) } });
        } catch (err) {
          const friendlyMessage = getFriendlyErrorMessage(err);
          dispatch({ type: 'PROCESSING_ERROR', payload: { error: friendlyMessage } });
        }
      }, [audioFile, detectedLanguage, profile, isFeatureLocked, isTrialExpired, isTrialUploadsLocked, preferredLanguage, dispatch]);

      const handleSaveTranscription = async () => {
        if (!audioFile || !profile || isSaving) return;
    
        dispatch({ type: 'START_SAVING' });
    
        try {
            if (state.transcriptionToUpdateId) {
                await updateTranscription(state.transcriptionToUpdateId, {
                    raw_transcript: rawTranscript,
                    cleaned_transcript: cleanedTranscript,
                    original_language: detectedLanguage,
                    filename: audioFile.name,
                });
                dispatch({ type: 'FINISH_SAVING', payload: { transcriptionId: state.transcriptionToUpdateId } });
            } else {
                const newTranscription = await addTranscription({
                    filename: audioFile.name,
                    raw_transcript: rawTranscript,
                    cleaned_transcript: cleanedTranscript,
                    audio_id: null,
                    user_id: profile.id,
                    original_language: detectedLanguage,
                });
                
                dispatch({ type: 'FINISH_SAVING', payload: { transcriptionId: newTranscription.id } });
                
                // Background audio upload
                uploadAndLinkAudio(newTranscription.id, audioFile, profile.id);
            }
        } catch (err) {
            dispatch({ type: 'SAVING_ERROR', payload: { error: getFriendlyErrorMessage(err) } });
        }
      };
    
      const handleRefine = async (contentType: RefineContentType, outputFormat: RefineOutputFormat) => {
        if (!rawTranscript) {
          dispatch({ type: 'REFINING_ERROR', payload: { error: 'Não há texto literal para refinar.' } });
          return;
        }
        
        dispatch({ type: 'START_REFINING', payload: { title: getRefinedTitle(contentType, outputFormat) } });
        let fullRefinedText = '';
        let refinementError: Error | null = null;
    
        try {
          for await (const chunk of refineTranscript(rawTranscript, contentType, outputFormat, preferredLanguage)) {
            fullRefinedText += chunk;
            dispatch({ type: 'UPDATE_ADVANCED_TRANSCRIPT', payload: { chunk } });
          }
          dispatch({ type: 'FINISH_REFINING', payload: { transcript: fullRefinedText } });
        } catch (err) {
          refinementError = err as Error;
          const friendlyMessage = getFriendlyErrorMessage(err);
          dispatch({ type: 'REFINING_ERROR', payload: { error: `Ocorreu um erro durante o refinamento: ${friendlyMessage}` } });
        } finally {
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
              }
          }
        }
      };

    const isProcessing = processStage === 'transcribing' || processStage === 'cleaning';
    const isAccordionMode = processStage === 'completed' && !advancedTranscript;
    const finalDisplayIsSingleColumn = (processStage === 'completed' && outputPreference !== 'both') || !!advancedTranscript;

    const { shouldShowTrialWarning, shouldShowTrialExpiredBanner, shouldShowMonthlyLimitBanner } = useMemo(() => ({
        shouldShowTrialWarning: plan === 'trial' && userStatus.isTrialActive && userStatus.trialDaysRemaining <= 5,
        shouldShowTrialExpiredBanner: isTrialExpired,
        shouldShowMonthlyLimitBanner: isUsageLocked && !isTrialExpired,
    }), [plan, userStatus.isTrialActive, userStatus.trialDaysRemaining, isTrialExpired, isUsageLocked]);

    return (
        <>
        {shouldShowTrialWarning && (
                <div className="max-w-3xl mx-auto w-full p-4 mb-6 bg-orange-100 dark:bg-orange-900/40 rounded-lg border border-orange-200 dark:border-orange-800/60 text-center animate-fade-in">
                <p className="font-semibold text-orange-800 dark:text-orange-200">Aviso do Período de Teste</p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    {userStatus.trialDaysRemaining > 1 ? `O seu período de teste termina em ${userStatus.trialDaysRemaining} dias.` : 'O seu período de teste termina hoje!'} Considere fazer um upgrade para manter o acesso.
                </p>
            </div>
        )}
        {shouldShowTrialExpiredBanner && (
            <div className="max-w-3xl mx-auto w-full p-4 mb-6 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg border border-yellow-200 dark:border-yellow-800/60 text-center animate-fade-in">
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">O seu período de teste gratuito terminou.</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">Para continuar a transcrever e usar todas as funcionalidades, por favor, escolha um plano.</p>
            </div>
        )}
        {shouldShowMonthlyLimitBanner && (
                <div className="max-w-3xl mx-auto w-full p-4 mb-6 bg-red-100 dark:bg-red-900/40 rounded-lg border border-red-200 dark:border-red-800/60 text-center animate-fade-in">
                <p className="font-semibold text-red-800 dark:text-red-200">Limite Mensal Atingido</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">Utilizou todo o tempo de transcrição do seu plano para este mês. O seu limite será reiniciado no próximo ciclo.</p>
            </div>
        )}

        {!audioFile ? (
            <div className="flex-grow flex flex-col">
                {recentHistorySection}
                <div className="flex-grow flex flex-col justify-center items-center">
                    <div className="max-w-3xl mx-auto w-full bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                            <FileUpload key={fileInputKey} onFileChange={handleFileChange} disabled={isProcessing || isTrialUploadsLocked} fileSelected={state.fileSelectionSuccess} />
                            <GoogleDrivePicker onFileImported={handleFileChange} disabled={isTrialUploadsLocked}/>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-4 text-center">Ficheiros de áudio suportados (.mp3, .wav, .m4a, etc.) com um limite de {MAX_FILE_SIZE_MB}MB.</p>
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
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">Pode <button onClick={() => window.location.hash = '#/recordings'} className="font-medium text-[#24a9c5] hover:underline focus:outline-none focus:ring-1 focus:ring-[#24a9c5] rounded">gravar um áudio</button>.</div>
                </div>
            </div>
        ) : processStage === 'idle' ? (
            <div className="max-w-5xl mx-auto animate-fade-in-up w-full">
                <div className="lg:grid lg:grid-cols-5 lg:gap-8 items-start">
                    <div className="lg:col-span-3">
                        <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                            <h2 className="text-xl font-bold text-center text-gray-800 dark:text-gray-200 mb-4">Ficheiro Pronto a Processar</h2>
                            <p className="text-center text-gray-600 dark:text-gray-400 break-words mb-4">{audioFile.name}</p>
                            {state.audioUrl && <CustomAudioPlayer src={state.audioUrl} />}
                        </div>
                    </div>
                    <div className="lg:col-span-2 mt-6 lg:mt-0">
                        <div className="text-left p-4 bg-white/60 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 rounded-lg shadow-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {estimatedTime && (<div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"><ClockIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" /><div><p className="font-semibold">Tempo Estimado</p><p className="text-gray-600 dark:text-gray-400">{estimatedTime}</p></div></div>)}
                                {precisionPotential !== null && (<div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"><TargetIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" /><div><p className="font-semibold">Potencial de Precisão</p><p className="text-gray-600 dark:text-gray-400">{precisionPotential}%</p></div></div>)}
                                <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"><TranslateIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" /><div><p className="font-semibold">Idioma Detetado</p>{isDetectingLanguage ? (<div className="flex items-center gap-2"><Loader className="w-4 h-4 text-gray-400" /><span className="text-gray-500 dark:text-gray-400 text-xs">A analisar...</span></div>) : (<p className="text-gray-600 dark:text-gray-400">{translateLanguageName(detectedLanguage)}</p>)}</div></div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"><div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"><ColumnsIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" /><div><p id="output-preference-label" className="font-semibold mb-2">Visualização do Resultado</p><div role="radiogroup" aria-labelledby="output-preference-label" className="flex flex-wrap gap-2"><button role="radio" aria-checked={outputPreference === 'both'} onClick={() => dispatch({ type: 'SET_OUTPUT_PREFERENCE', payload: 'both' })} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${outputPreference === 'both' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>Ambos</button><button role="radio" aria-checked={outputPreference === 'raw'} onClick={() => dispatch({ type: 'SET_OUTPUT_PREFERENCE', payload: 'raw' })} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${outputPreference === 'raw' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>Apenas Literal</button><button role="radio" aria-checked={outputPreference === 'cleaned'} onClick={() => dispatch({ type: 'SET_OUTPUT_PREFERENCE', payload: 'cleaned' })} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${outputPreference === 'cleaned' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>Apenas Formatado</button></div></div></div></div>
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex flex-col gap-3 items-center justify-center">
                  <button onClick={handleProcessAudio} disabled={isProcessing || isDetectingLanguage} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#24a9c5] text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:bg-[#1e8a9f] disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"><ArrowRightIcon className="w-5 h-5" /><span>Iniciar Processo</span></button>
                  <button onClick={handleReset} className="text-sm text-gray-500 dark:text-gray-400 hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] dark:focus:ring-offset-gray-900 rounded-md p-1">Substituir Áudio</button>
                </div>
            </div>
        ) : null}

        {error && <div className="text-center text-red-800 bg-red-100 p-3 my-4 rounded-lg border border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800/50">{error}</div>}

        {processStage !== 'idle' && (
            <div className="mt-6 max-w-3xl mx-auto w-full">
                <div className="mb-6 p-4 bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    <div className="text-center"><p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{processStage === 'completed' ? 'Ficheiro Processado:' : 'A processar o ficheiro:'}</p>{isProcessing ? (<div className="relative w-full flex overflow-x-hidden h-7 items-center"><div className="animate-marquee whitespace-nowrap flex items-center"><p className="text-lg font-bold text-gray-800 dark:text-gray-200 px-4">{audioFile?.name}</p></div><div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center h-full"><p className="text-lg font-bold text-gray-800 dark:text-gray-200 px-4">{audioFile?.name}</p></div></div>) : (<p className="text-lg font-bold text-gray-800 dark:text-gray-200 truncate px-4">{audioFile?.name}</p>)}</div>
                    {processStage === 'completed' && state.audioUrl ? (<><div className="mt-4"><CustomAudioPlayer src={state.audioUrl} /></div><div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">{state.processingTime && (<div className="flex items-start gap-3 text-gray-700 dark:text-gray-300 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg"><ClockIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" /><div><p className="font-semibold">Tempo de Processamento</p><p className="text-gray-600 dark:text-gray-400">{state.processingTime}</p></div></div>)}{precisionPotential !== null && (<div className="flex items-start gap-3 text-gray-700 dark:text-gray-300 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg"><TargetIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" /><div><p className="font-semibold">Precisão Final Atingida</p><p className="text-gray-600 dark:text-gray-400">{precisionPotential}%</p></div></div>)}{detectedLanguage && (<div className="flex items-start gap-3 text-gray-700 dark:text-gray-300 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg"><TranslateIcon className="w-5 h-5 text-[#24a9c5] flex-shrink-0 mt-1" /><div><p className="font-semibold">Idioma Original</p><p className="text-gray-600 dark:text-gray-400">{translateLanguageName(detectedLanguage)}</p></div></div>)}</div></>) : (<div className="mt-2 flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">{estimatedTime && (<span className="flex items-center gap-1"><ClockIcon className="w-4 h-4" /><span>Tempo Est.: {estimatedTime}</span></span>)}{precisionPotential !== null && (<span className="flex items-center gap-1"><TargetIcon className="w-4 h-4" /><span>Potencial: {precisionPotential}%</span></span>)}{isDetectingLanguage && (<span className="flex items-center gap-1"><Loader className="w-3 h-3"/><span>A detetar idioma...</span></span>)}{detectedLanguage && !isDetectingLanguage && (<span className="flex items-center gap-1"><TranslateIcon className="w-4 h-4" /><span>{translateLanguageName(detectedLanguage)}</span></span>)}</div>)}
                </div>
                <ProgressBar stage={processStage} />
            </div>
        )}

        {(rawTranscript || cleanedTranscript || isProcessing || advancedTranscript || isRefining) && (
            <div className={`mt-12 grid grid-cols-1 ${!advancedTranscript && !isRefining && (finalDisplayIsSingleColumn ? 'lg:grid-cols-1' : 'lg:grid-cols-2')} gap-8`}>
                {(isProcessing || (processStage === 'completed' && (outputPreference === 'raw' || outputPreference === 'both'))) && <TranscriptDisplay title="Texto Literal" text={rawTranscript} isLoading={processStage === 'transcribing'} isComplete={processStage !== 'transcribing' && rawTranscript.length > 0} isExpanded={!isAccordionMode || state.expandedTranscript === 'raw'} isClickable={isAccordionMode} onToggle={() => dispatch({ type: 'TOGGLE_EXPANDED', payload: 'raw' })}/>}
                {(isProcessing || (processStage === 'completed' && (outputPreference === 'cleaned' || outputPreference === 'both'))) && <TranscriptDisplay title={`Texto Formatado (${languageMap[preferredLanguage]})`} text={cleanedTranscript} isLoading={processStage === 'cleaning'} isComplete={processStage === 'completed' && cleanedTranscript.length > 0} placeholder={processStage === 'cleaning' || processStage === 'completed' ? "A aguardar pela otimização..." : "O resultado aparecerá aqui."} renderAsHTML={true} isExpanded={!isAccordionMode || state.expandedTranscript === 'cleaned'} isClickable={isAccordionMode} onToggle={() => dispatch({ type: 'TOGGLE_EXPANDED', payload: 'cleaned' })}/>}
                {(advancedTranscript || isRefining) && <TranscriptDisplay title={advancedTranscriptTitle || 'Documento Refinado'} text={advancedTranscript} isLoading={isRefining} isComplete={!isRefining && advancedTranscript.length > 0} placeholder="O resultado do refinamento aparecerá aqui." renderAsHTML={true} isExpanded={true} isClickable={false} onToggle={() => {}}/>}
            </div>
        )}
        
        {processStage === 'completed' && (
            <>
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
                    {(!currentTranscriptionId && rawTranscript) && (<button onClick={handleSaveTranscription} disabled={isSaving} className="w-full sm:w-auto flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-8 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? <Loader className="w-5 h-5" /> : <SaveIcon className="w-5 h-5" />}<span>{isSaving ? 'A Guardar...' : 'Guardar Transcrição'}</span></button>)}
                    {currentTranscriptionId && (<div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold py-3 px-8 rounded-lg bg-green-100 dark:bg-green-900/50"><CheckIcon className="w-5 h-5" /><span>Guardado com Sucesso</span></div>)}
                    <button onClick={handleReset} className="w-full sm:w-auto flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-3 px-8 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"><ReloadIcon className="w-5 h-5" /><span>Transcrever Novo Ficheiro</span></button>
                </div>
                <div className="mt-4 text-center">
                    <button onClick={() => { if (isFeatureLocked) { /* ... error handling */ } else if (!canAccessPremium) { dispatch({ type: 'PROCESSING_ERROR', payload: { error: "O Refinamento Avançado é exclusivo do plano Premium." } }); window.scrollTo(0, 0); } else { setIsRefineModalOpen(true); } }} className="font-bold text-[#24a9c5] hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] dark:focus:ring-offset-gray-900 rounded-md p-1">ou faça um Refinamento Avançado</button>
                </div>
            </>
        )}
         <RefineModal
            isOpen={isRefineModalOpen}
            onClose={() => setIsRefineModalOpen(false)}
            onSubmit={handleRefine}
            isRefining={isRefining}
        />
        </>
    );
};