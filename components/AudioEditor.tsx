import React, { useEffect, useRef, useState, useCallback } from 'react';
import { sliceAudio, formatPlayerTime } from '../utils/audioUtils';
import { Loader } from './Loader';
// FIX: Aliased PlayIcon and PauseIcon to match the component's usage, and imported the newly added ZoomInIcon and ZoomOutIcon.
import { PlayIcon as PlayFilledIcon, PauseIcon as PauseFilledIcon, ZoomInIcon, ZoomOutIcon, ReloadIcon } from './Icons';

// Augment the window object for TypeScript to recognize WaveSurfer and its plugins
declare global {
  interface Window {
    WaveSurfer: any;
    RegionsPlugin: any;
  }
}

interface AudioEditorProps {
  audioFile: File;
  onSegmentReady: (blob: Blob | null) => void;
}

export const AudioEditor: React.FC<AudioEditorProps> = ({ audioFile, onSegmentReady }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const regionRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(50);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSliceAudio = useCallback(async (start: number, end: number) => {
    try {
        setError(null);
        const segmentBlob = await sliceAudio(audioFile, start, end);
        onSegmentReady(segmentBlob);
    } catch (err) {
        console.error("Error slicing audio:", err);
        setError("Não foi possível cortar o segmento de áudio. A seleção pode ser inválida.");
        onSegmentReady(null);
    }
  }, [audioFile, onSegmentReady]);

  useEffect(() => {
    if (!waveformRef.current || !audioFile) return;

    const WaveSurfer = window.WaveSurfer;
    const RegionsPlugin = window.WaveSurfer.Regions;
    
    if (!WaveSurfer || !RegionsPlugin) {
        setError("A biblioteca do editor de áudio não conseguiu carregar.");
        setIsLoading(false);
        return;
    }
    
    setIsLoading(true);
    
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#a1a1aa', // zinc-400
      progressColor: '#24a9c5',
      cursorColor: '#18181b', // zinc-900
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 128,
      url: URL.createObjectURL(audioFile),
      minPxPerSec: 10,
    });

    const wsRegions = ws.registerPlugin(RegionsPlugin.create());

    ws.on('ready', (newDuration: number) => {
      setDuration(newDuration);
      setIsLoading(false);
      ws.zoom(zoomLevel);
    });

    ws.on('timeupdate', (time: number) => setCurrentTime(time));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    ws.on('error', (err: Error) => {
        setError(`Erro ao carregar áudio: ${err.message}`);
        setIsLoading(false);
    });

    wsRegions.on('region-updated', (region: any) => {
      setSelection({ start: region.start, end: region.end });
      handleSliceAudio(region.start, region.end);
    });
    
    wsRegions.on('region-created', (region: any) => {
        if (regionRef.current) {
            regionRef.current.remove();
        }
        regionRef.current = region;
        setSelection({ start: region.start, end: region.end });
        handleSliceAudio(region.start, region.end);
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioFile, zoomLevel, handleSliceAudio]);

  const togglePlayPause = () => wavesurferRef.current?.playPause();
  
  const handleZoom = (level: number) => {
    const newZoom = Math.max(10, Math.min(200, zoomLevel + level));
    setZoomLevel(newZoom);
  };

  const clearSelection = () => {
    if (regionRef.current) {
        regionRef.current.remove();
        regionRef.current = null;
    }
    setSelection(null);
    onSegmentReady(null);
  };

  return (
    <div className="space-y-4">
      <div ref={waveformRef} className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg relative">
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50">
                <div className="text-center">
                    <Loader className="w-8 h-8 text-[#24a9c5] mx-auto" />
                    <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">A gerar onda sonora...</p>
                </div>
            </div>
        )}
        {error && <div className="absolute inset-0 flex items-center justify-center bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-4">{error}</div>}
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button onClick={togglePlayPause} disabled={isLoading} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors">
              {isPlaying ? <PauseFilledIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" /> : <PlayFilledIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />}
            </button>
            <div className="font-mono text-sm text-gray-700 dark:text-gray-300">
              <span>{formatPlayerTime(currentTime)}</span> / <span>{formatPlayerTime(duration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleZoom(-10)} disabled={isLoading} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors">
              <ZoomOutIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
            </button>
            <button onClick={() => handleZoom(10)} disabled={isLoading} className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors">
              <ZoomInIcon className="w-6 h-6 text-gray-800 dark:text-gray-200" />
            </button>
          </div>
      </div>
       <div className="text-center p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700/80">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {selection ? `Seleção: ${formatPlayerTime(selection.start)} - ${formatPlayerTime(selection.end)}` : 'Clique e arraste na onda sonora para selecionar um segmento.'}
          </p>
          {selection && (
            <button onClick={clearSelection} className="mt-1 text-xs text-[#24a9c5] hover:underline">
              Limpar Seleção
            </button>
          )}
      </div>
    </div>
  );
};