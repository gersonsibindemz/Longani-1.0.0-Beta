import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon } from './Icons';
import { Loader } from './Loader';
import { formatPlayerTime } from '../utils/audioUtils';
import { CustomAudioPlayer } from './CustomAudioPlayer';

interface VoiceRecorderProps {
  onSave: (audioBlob: Blob) => void;
}

type RecordingStatus = 'idle' | 'permission' | 'recording' | 'stopped';
type RecordingQuality = 'standard' | 'high';

const qualityProfiles: { [key in RecordingQuality]: { label: string, audioBitsPerSecond: number } } = {
  standard: { label: 'Padrão (128kbps)', audioBitsPerSecond: 128000 },
  high: { label: 'Alta Qualidade (256kbps)', audioBitsPerSecond: 256000 }
};

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave }) => {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<RecordingQuality>('standard');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const resetState = () => {
    setStatus('idle');
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
    audioChunksRef.current = [];
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }

  const startRecording = async () => {
    resetState();
    setStatus('permission');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000, // Request high-quality sample rate for better audio fidelity.
          // Requesting raw audio without processing can improve transcription accuracy
          // if the recording environment is relatively clean.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      
      // Handle interruptions like incoming calls which can terminate the stream.
      stream.getTracks().forEach(track => {
        track.onended = () => {
          // Check if the recorder is still in the 'recording' state.
          // This prevents this from firing on a manual stop.
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            stopRecording();
            setError("A gravação foi interrompida. Isto pode acontecer devido a uma chamada telefónica ou outra aplicação a usar o microfone.");
          }
        };
      });

      setStatus('recording');
      
      const options: MediaRecorderOptions = {
        audioBitsPerSecond: qualityProfiles[quality].audioBitsPerSecond,
      };

      // Prefer a standard mp4 (AAC codec) container if available. WebM (Opus codec) is a great fallback.
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
      }
      // If no preferred format is supported, the browser will use its default with the specified bitrate.

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/wav'; // fallback
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setStatus('stopped');
        stream.getTracks().forEach(track => track.stop()); // Release microphone
      };

      mediaRecorderRef.current.start();
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("O acesso ao microfone foi negado. Por favor, verifique as permissões do seu navegador.");
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleSave = () => {
    if (audioChunksRef.current.length > 0) {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/wav';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        onSave(audioBlob);
        resetState();
    }
  };
  
  const handleDiscard = () => {
    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
    }
    resetState();
  };

  return (
    <div className="bg-white/60 dark:bg-gray-800/60 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Gravar Áudio</h3>
        <div className="mt-2 sm:mt-0" role="radiogroup" aria-labelledby="quality-label">
            <span id="quality-label" className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2 sr-only">Qualidade:</span>
            <div className="flex items-center gap-2">
                <button role="radio" aria-checked={quality === 'standard'} onClick={() => setQuality('standard')} disabled={status === 'recording' || status === 'permission'} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${quality === 'standard' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    {qualityProfiles.standard.label}
                </button>
                <button role="radio" aria-checked={quality === 'high'} onClick={() => setQuality('high')} disabled={status === 'recording' || status === 'permission'} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${quality === 'high' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    {qualityProfiles.high.label}
                </button>
            </div>
        </div>
      </div>
      
      {error && (
        <div className="text-center text-red-800 bg-red-100 p-3 my-2 rounded-lg border border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800/50">{error}</div>
      )}

      <div className="flex flex-col items-center justify-center gap-4">
        {status !== 'stopped' && (
          <div className="flex items-center gap-4">
            <button
              onClick={status === 'recording' ? stopRecording : startRecording}
              disabled={status === 'permission'}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-300 transform hover:scale-105 disabled:opacity-50
                ${status === 'recording' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#24a9c5] hover:bg-[#1e8a9f]'}`}
              aria-label={status === 'recording' ? 'Parar gravação' : 'Iniciar gravação'}
            >
              {status === 'permission' ? <Loader className="w-8 h-8" /> : 
               status === 'recording' ? <StopIcon className="w-8 h-8" /> : 
               <MicrophoneIcon className="w-8 h-8" />
              }
            </button>
            <p className="text-2xl font-mono font-semibold text-gray-700 dark:text-gray-300 w-24 text-center">
                {formatPlayerTime(recordingTime)}
            </p>
          </div>
        )}
        
        {status === 'stopped' && audioUrl && (
          <div className="w-full space-y-4">
             <CustomAudioPlayer src={audioUrl} />
             <div className="flex flex-col sm:flex-row gap-3">
                <button
                    onClick={handleSave}
                    className="w-full inline-flex justify-center rounded-md bg-[#24a9c5] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1e8a9f]"
                >
                    Guardar Gravação
                </button>
                <button
                    onClick={handleDiscard}
                    className="w-full inline-flex justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                    Descartar
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
