import React, { useState, useRef, useEffect } from 'react';
import { AudioRecording } from '../types';
import { PlayIcon, PauseIcon, CloseIcon } from './Icons';
import { formatPlayerTime } from '../utils/audioUtils';

interface NowPlayingBarProps {
  audio: AudioRecording;
  audioUrl: string;
  onClose: () => void;
}

export const NowPlayingBar: React.FC<NowPlayingBarProps> = ({ audio, audioUrl, onClose }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const setAudioData = () => {
        setDuration(audioElement.duration);
        setCurrentTime(audioElement.currentTime);
      };

      const setAudioTime = () => setCurrentTime(audioElement.currentTime);
      
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      audioElement.addEventListener('loadeddata', setAudioData);
      audioElement.addEventListener('timeupdate', setAudioTime);
      audioElement.addEventListener('play', handlePlay);
      audioElement.addEventListener('pause', handlePause);
      audioElement.addEventListener('ended', handlePause);
      
      // Autoplay when component mounts with a new URL
      audioElement.play().catch(e => console.error("Autoplay failed", e));
      
      return () => {
        audioElement.removeEventListener('loadeddata', setAudioData);
        audioElement.removeEventListener('timeupdate', setAudioTime);
        audioElement.removeEventListener('play', handlePlay);
        audioElement.removeEventListener('pause', handlePause);
        audioElement.removeEventListener('ended', handlePause);
      };
    }
  }, [audioUrl]); // Reruns when the audio source changes

  const togglePlayPause = () => {
    const audioElement = audioRef.current;
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
    }
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audioElement = audioRef.current;
    if (audioElement) {
        audioElement.currentTime = Number(e.target.value);
        setCurrentTime(audioElement.currentTime);
    }
  };
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] animate-fade-in-up" style={{ animationFillMode: 'backwards', animationDelay: '0.1s' }}>
      <audio ref={audioRef} src={audioUrl} />
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <button 
            onClick={togglePlayPause} 
            className="flex-shrink-0 p-2 text-gray-700 dark:text-gray-300 hover:text-[#24a9c5] dark:hover:text-[#24a9c5] transition-colors"
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
        >
          {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate text-gray-800 dark:text-gray-200" title={audio.name}>{audio.name}</p>
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatPlayerTime(currentTime)}</span>
            <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-1.5 group relative">
                <div className="bg-[#24a9c5] h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                <input 
                  type="range" 
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  aria-label="Progresso do áudio"
                  className="absolute w-full h-full top-0 left-0 opacity-0 cursor-pointer"
                />
            </div>
            <span>{formatPlayerTime(duration)}</span>
          </div>
        </div>
        <button 
            onClick={onClose} 
            className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="Fechar leitor de áudio"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
