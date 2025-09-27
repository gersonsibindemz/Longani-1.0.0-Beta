import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlayIcon, PauseIcon } from './Icons';
import { formatPlayerTime } from '../utils/audioUtils';

interface CustomAudioPlayerProps {
  src: string | null;
}

export const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
      setCanPlay(true);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);
    
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);
    
    // If src changes, reset and load new source
    if (src && audio.src !== src) {
      setCanPlay(false);
      audio.load();
    }

    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlayPause = useCallback(() => {
    if (!canPlay) return;
    const audio = audioRef.current;
    if (audio) {
        if (audio.paused) {
            audio.play().then(() => setIsPlaying(true));
        } else {
            audio.pause();
            setIsPlaying(false);
        }
    }
  }, [canPlay]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canPlay) return;
    const time = Number(e.target.value);
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };
  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 w-full p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <audio ref={audioRef} src={src ?? undefined} preload="metadata" className="hidden" />
      <button 
        onClick={togglePlayPause} 
        disabled={!canPlay}
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-[#24a9c5] hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] dark:focus:ring-offset-gray-900"
        aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
      </button>
      <div className="flex-grow flex items-center gap-2">
        <span className="font-mono text-xs text-gray-600 dark:text-gray-400 select-none">
            {formatPlayerTime(currentTime)}
        </span>
        <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-1.5 group relative">
            <div className="bg-[#24a9c5] h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
            <input 
              type="range" 
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              disabled={!canPlay}
              aria-label="Progresso do áudio"
              className="absolute w-full h-full top-0 left-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
        </div>
        <span className="font-mono text-xs text-gray-600 dark:text-gray-400 select-none">
            {formatPlayerTime(duration)}
        </span>
      </div>
    </div>
  );
};
