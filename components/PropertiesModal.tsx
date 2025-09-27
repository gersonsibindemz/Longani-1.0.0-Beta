import React, { useEffect, useState } from 'react';
import { CloseIcon } from './Icons';
import { Transcription, AudioRecording } from '../utils/db';
import { getAudioDuration, formatFileSize, formatPlayerTime } from '../utils/audioUtils';

interface PropertiesModalProps {
  item: Transcription | AudioRecording | null;
  onClose: () => void;
  additionaData?: { folderName?: string | null };
}

const isTranscription = (item: any): item is Transcription => 'rawTranscript' in item;

const PropertyRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 col-span-1">{label}</dt>
    <dd className="text-sm text-gray-900 dark:text-gray-100 col-span-2 break-words">{value}</dd>
  </div>
);

export const PropertiesModal: React.FC<PropertiesModalProps> = ({ item, onClose, additionaData }) => {
  const [audioDuration, setAudioDuration] = useState<string | null>(null);

  useEffect(() => {
    const fetchDuration = async () => {
      if (item && !isTranscription(item)) {
        try {
          const duration = await getAudioDuration(new File([item.audioBlob], item.name));
          setAudioDuration(formatPlayerTime(duration));
        } catch {
          setAudioDuration('N/A');
        }
      }
    };
    fetchDuration();
  }, [item]);

  if (!item) return null;

  const renderContent = () => {
    if (isTranscription(item)) {
      const rawWordCount = item.rawTranscript.split(/\s+/).filter(Boolean).length;
      const cleanedWordCount = item.cleanedTranscript.replace(/<[^>]*>?/gm, ' ').split(/\s+/).filter(Boolean).length;
      return (
        <>
          <PropertyRow label="Ficheiro" value={item.filename} />
          <PropertyRow label="Data" value={new Date(item.date).toLocaleString('pt-PT')} />
          <PropertyRow label="Pasta" value={additionaData?.folderName || 'Sem Pasta'} />
          <PropertyRow label="Tags" value={item.tags?.map(t => `#${t}`).join(', ') || 'Nenhuma'} />
          <PropertyRow label="Palavras (Literal)" value={rawWordCount} />
          <PropertyRow label="Palavras (Formatado)" value={cleanedWordCount} />
          <PropertyRow label="ID de Áudio" value={item.audioId || 'N/A'} />
        </>
      );
    } else { // It's an AudioRecording
      return (
        <>
          <PropertyRow label="Ficheiro" value={item.name} />
          <PropertyRow label="Data" value={new Date(item.date).toLocaleString('pt-PT')} />
          <PropertyRow label="Tipo" value={item.type === 'recording' ? 'Gravação' : 'Carregado'} />
          <PropertyRow label="Tamanho" value={formatFileSize(item.audioBlob.size)} />
          <PropertyRow label="MIME Type" value={item.audioBlob.type} />
          <PropertyRow label="Duração" value={audioDuration || 'A calcular...'} />
        </>
      );
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="properties-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl transform transition-all animate-zoom-in">
        <div className="flex items-start justify-between p-4 border-b rounded-t dark:border-gray-600">
            <h3 id="properties-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                Propriedades
            </h3>
            <button onClick={onClose} aria-label="Fechar" className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white">
                <CloseIcon className="w-5 h-5" />
            </button>
        </div>
        <div className="p-6">
            <dl>{renderContent()}</dl>
        </div>
      </div>
    </div>
  );
};