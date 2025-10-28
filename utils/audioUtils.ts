import { Plan, Profile, AudioFile } from "../types";

export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('audio/')) {
      return reject(new Error('Ficheiro inválido. Por favor, selecione um ficheiro de áudio.'));
    }
    const audio = new Audio(URL.createObjectURL(file));
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(audio.src); // Clean up the object URL
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error('Não foi possível ler os metadados do ficheiro de áudio.'));
    });
  });
};

const formatDurationEstimate = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return 'cálculo indisponível';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (minutes > 0 && seconds > 0) {
    return `~${minutes} min e ${seconds} seg`;
  }
  if (minutes > 0) {
    return `~${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
  return `~${seconds} segundos`;
};

export const formatPlayerTime = (seconds: number): string => {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return '00:00';
  }
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


// Heuristic: processing is ~4x faster than realtime + 5s buffer
export const estimateProcessingTime = (durationInSeconds: number): string => {
  const estimatedSeconds = (durationInSeconds / 4) + 5;
  return formatDurationEstimate(estimatedSeconds);
};

export const getNumericProcessingTimeEstimate = (durationInSeconds: number): number => {
    if (isNaN(durationInSeconds) || durationInSeconds < 0) {
      return 0;
    }
    // Heuristic: processing is ~4x faster than realtime + 5s buffer
    return (durationInSeconds / 4) + 5;
};

export const formatProcessingTime = (milliseconds: number): string => {
    if (isNaN(milliseconds) || milliseconds < 0) {
      return 'N/A';
    }
    const totalSeconds = milliseconds / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
  
    let result = '';
    if (minutes > 0) {
      result += `${minutes} min `;
    }
    if (seconds > 0 || minutes === 0) {
      result += `${seconds} seg`;
    }
    return result.trim();
};

export const estimatePrecisionPotential = (fileName: string): number => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'wav':
        case 'flac':
            return 95; // Lossless formats
        case 'm4a':
        case 'aac':
            return 85; // High-quality compressed
        case 'mp3':
        case 'ogg':
        case 'webm':
             return 75; // Standard compressed
        default:
            return 65; // Unknown/other
    }
};

/**
 * Calculates a dynamic precision score based on the transcription content.
 * The score starts with an initial potential and decreases based on the
 * number of "[inaudible]" markers found in the text.
 * @param transcript The raw transcript text generated so far.
 * @param initialPotential The starting precision score, usually based on file type.
 * @returns A new precision score between a min value (e.g., 40) and the initial potential.
 */
export const calculateDynamicPrecision = (
    transcript: string,
    initialPotential: number
): number => {
    if (!transcript.trim()) {
        return initialPotential;
    }

    const words = transcript.split(/\s+/);
    if (words.length < 10) { // Don't start penalizing until there's some text
        return initialPotential;
    }

    const inaudibleCount = (transcript.match(/\[inaudible\]/gi) || []).length;
    
    // Each "[inaudible]" marker applies a fixed penalty.
    const penaltyPerInaudible = 3;
    const totalPenalty = inaudibleCount * penaltyPerInaudible;

    // Ensure the score doesn't drop below a reasonable minimum.
    const MIN_SCORE = 40;
    const newScore = Math.max(MIN_SCORE, initialPotential - totalPenalty);
    
    return Math.round(newScore);
};

/**
 * Maps known technical error messages to user-friendly Portuguese messages.
 * This function also logs the original error to the console for debugging purposes,
 * helping developers to identify issues while providing clear, actionable feedback to users.
 *
 * @param error The error object or string to be processed.
 * @param transcriptionId An optional unique ID for the job to aid in debugging.
 * @returns A user-friendly error message string in Portuguese.
 */
export const getFriendlyErrorMessage = (error: unknown, transcriptionId?: string): string => {
  const logPrefix = transcriptionId ? `[Error TID: ${transcriptionId}]` : '[Error]';
  // Log the original error for debugging.
  console.error(`${logPrefix} An error was caught and processed for the user:`, error);

  // Default message for truly unknown errors.
  let friendlyMessage = 'Ocorreu um erro inesperado. Por favor, tente novamente ou contacte o suporte se o problema persistir.';

  let technicalMessage = '';
  if (error instanceof Error) {
    technicalMessage = error.message.toUpperCase();
  } else if (typeof error === 'string') {
    technicalMessage = error.toUpperCase();
  }

  // --- Gemini API / Network Errors ---
  if (technicalMessage.includes('API_KEY_INVALID') || technicalMessage.includes('API KEY')) {
    friendlyMessage = 'A chave de acesso ao serviço de IA é inválida ou está em falta. Por favor, contacte o suporte técnico para resolver este problema de configuração.';
    // Provide a more specific log for developers.
    console.error(`${logPrefix} Developer Info: The Gemini API key is missing, invalid, or expired.`);
  } else if (technicalMessage.includes('QUOTA')) {
    friendlyMessage = 'O limite diário de utilizações gratuitas foi atingido. Sendo uma aplicação gratuita, utilizamos um plano com uma quota diária partilhada por todos os utilizadores. O serviço será restaurado amanhã. Por favor, tente novamente mais tarde.';
  } else if (technicalMessage.includes('SAFETY')) {
    friendlyMessage = 'O conteúdo do áudio não pôde ser processado devido às políticas de segurança. Isto pode ocorrer com temas sensíveis ou linguagem inapropriada.';
  } else if (technicalMessage.includes('NETWORK') || technicalMessage.includes('FETCH') || technicalMessage.includes('FAILED TO FETCH') || technicalMessage.includes('OFFLINE')) {
    friendlyMessage = 'Falha de comunicação com o servidor. Verifique a sua ligação à internet e tente novamente. Se estiver a usar uma VPN, tente desativá-la temporariamente.';
  } else if (technicalMessage.includes('INVALID_ARGUMENT')) {
     friendlyMessage = 'Ocorreu um erro ao processar o ficheiro. Pode estar num formato não suportado, ser inválido ou estar corrompido. Tente usar um ficheiro de áudio diferente.';
  } else if (technicalMessage.includes('MODEL_NOT_FOUND')) {
      friendlyMessage = 'O modelo de IA configurado não foi encontrado. Por favor, contacte o suporte técnico para corrigir a configuração da aplicação.';
  } else if (technicalMessage.includes('DEADLINE_EXCEEDED') || technicalMessage.includes('TIMEOUT')) {
      friendlyMessage = 'O pedido demorou demasiado tempo a responder e foi cancelado. Isto pode dever-se a uma ligação lenta ou a um ficheiro muito grande. Por favor, tente novamente.';
  }
  
  // --- Local File Handling Errors (from our own code) ---
  else if (technicalMessage.includes('NÃO FOI POSSÍVEL LER O FICHEIRO')) {
    // This message is already friendly, but we centralize it for consistency.
    friendlyMessage = 'Não foi possível ler o ficheiro selecionado. Pode estar corrompido ou o navegador pode não ter permissão para o aceder.';
  } else if (technicalMessage.includes('FALHA AO CONVERTER O FICHEIRO PARA BASE64')) {
    friendlyMessage = 'Ocorreu um erro ao preparar o ficheiro para envio. Por favor, tente usar um ficheiro diferente ou converter o áudio para um formato comum como MP3 ou WAV.';
  }

  // Log the final message that will be displayed to the user.
  console.log(`${logPrefix} [User-Facing Error]: ${friendlyMessage}`);
  
  return friendlyMessage;
};

/**
 * Converts an AudioBuffer to a WAV audio format Blob.
 * This is a helper function for `sliceAudio`.
 * @param abuffer The AudioBuffer to convert.
 * @returns A Blob containing the audio data in WAV format.
 */
function bufferToWave(abuffer: AudioBuffer): Blob {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };

    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    for (i = 0; i < abuffer.numberOfChannels; i++) {
        channels.push(abuffer.getChannelData(i));
    }

    while (offset < abuffer.length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: "audio/wav" });
}

/**
 * Slices a segment from an audio file using the Web Audio API.
 * @param file The source audio file.
 * @param startTime The start time of the segment in seconds.
 * @param endTime The end time of the segment in seconds.
 * @returns A promise that resolves with a Blob of the sliced audio segment in WAV format.
 */
export const sliceAudio = (file: File, startTime: number, endTime: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const { sampleRate, length, numberOfChannels } = audioBuffer;
                const startOffset = Math.floor(startTime * sampleRate);
                const endOffset = Math.floor(endTime * sampleRate);
                const frameCount = endOffset - startOffset;

                if (frameCount <= 0) {
                    return reject(new Error('Invalid selection: end time must be after start time.'));
                }
                if (endOffset > length) {
                    return reject(new Error('Invalid selection: end time is beyond audio duration.'));
                }

                const newAudioBuffer = audioContext.createBuffer(numberOfChannels, frameCount, sampleRate);
                for (let i = 0; i < numberOfChannels; i++) {
                    newAudioBuffer.getChannelData(i).set(audioBuffer.getChannelData(i).subarray(startOffset, endOffset));
                }
                
                const offlineContext = new OfflineAudioContext(numberOfChannels, frameCount, sampleRate);
                const bufferSource = offlineContext.createBufferSource();
                bufferSource.buffer = newAudioBuffer;
                bufferSource.connect(offlineContext.destination);
                bufferSource.start();

                const renderedBuffer = await offlineContext.startRendering();
                const wavBlob = bufferToWave(renderedBuffer);
                resolve(wavBlob);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error("Failed to read the audio file."));
        reader.readAsArrayBuffer(file);
    });
};

const languageNameMap: { [key: string]: string } = {
    'portuguese': 'Português',
    'english': 'Inglês',
    'spanish': 'Espanhol',
    'french': 'Francês',
    'german': 'Alemão',
    'italian': 'Italiano',
    'dutch': 'Holandês',
    'russian': 'Russo',
    'chinese': 'Chinês',
    'japanese': 'Japonês',
    'korean': 'Coreano',
    'arabic': 'Árabe',
    'indeterminate': 'Indeterminado',
};

export const translateLanguageName = (englishNames: string | null): string => {
    if (!englishNames) return 'N/A';

    const originalNames = englishNames.split(',').map(name => name.trim());
    const translatedNames = originalNames.map(name => {
        const lowerName = name.toLowerCase();
        return languageNameMap[lowerName] || name; // Fallback to the original name if not in the map
    });

    return translatedNames.join(', ');
};

// --- Trial Period Utilities ---

export const TRIAL_PERIOD_DAYS = 5;
const TRIAL_PERIOD_MS = TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Gets the expiration date of the trial.
 * @param createdAt The ISO date string when the account was created.
 * @returns The trial end date.
 */
export const getTrialEndDate = (createdAt: string): Date => {
    return new Date(new Date(createdAt).getTime() + TRIAL_PERIOD_MS);
};

/**
 * Checks if the user's trial period is currently active.
 * @param createdAt The ISO date string when the account was created.
 * @returns True if the trial is active, false otherwise.
 */
export const isTrialActive = (createdAt?: string): boolean => {
    if (!createdAt) return false; // No trial if no creation date
    return Date.now() < (new Date(createdAt).getTime() + TRIAL_PERIOD_MS);
};

/**
 * Calculates the number of days remaining in the trial period.
 * @param createdAt The ISO date string when the account was created.
 * @returns The number of full days remaining. Returns 0 if expired.
 */
export const getTrialDaysRemaining = (createdAt?: string): number => {
    if (!createdAt) return 0;
    
    const trialEndTime = new Date(createdAt).getTime() + TRIAL_PERIOD_MS;
    const now = Date.now();

    if (now >= trialEndTime) {
        return 0;
    }

    const diffMs = trialEndTime - now;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

// --- Plan Permissions Utilities ---

/**
 * Returns the monthly transcription limits in seconds for each plan.
 */
export const getPlanLimits = (): Record<Plan, number> => ({
    trial: 3 * 3600,      // 3 hours (same as Básico)
    basico: 3 * 3600,      // 3 hours
    ideal: 10 * 3600,     // 10 hours
    premium: Infinity,
});

/**
 * Calculates the total seconds of audio transcribed in the current calendar month.
 * @param audioFiles An array of the user's audio files for the current month.
 * @returns The total duration in seconds.
 */
export const calculateMonthlyUsage = (audioFiles: AudioFile[]): number => {
    return audioFiles.reduce((total, file) => total + (file.duration_seconds || 0), 0);
};