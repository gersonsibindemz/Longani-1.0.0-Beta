import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getAllAudioFiles, deleteAudioFile, AudioRecording, addAudioFile, updateAudioFile, getAllTranscriptions, Transcription } from '../utils/db';
import { Loader } from './Loader';
import { TrashIcon, SparkleIcon, PlayIcon, SearchIcon, StarIcon, StarOutlineIcon, MoreVerticalIcon, EditIcon, InfoIcon } from './Icons';
import { longaniLogoUrl } from './Header';
import { ConfirmationModal } from './ConfirmationModal';
import { VoiceRecorder } from './VoiceRecorder';
import { DropdownMenu } from './DropdownMenu';
import { PropertiesModal } from './PropertiesModal';

interface AudioItemProps {
  audio: AudioRecording;
  onDelete: () => void;
  onTranscribe: () => void;
  onPlayAudio: (audio: AudioRecording) => void;
  onSetFavorite: (isFavorite: boolean) => void;
  onRename: (id: string, newName: string) => void;
  onShowProperties: () => void;
  onViewTranscription: (id: string) => void;
  allTranscriptions: Transcription[];
}

const AudioItem: React.FC<AudioItemProps> = ({ audio, onDelete, onTranscribe, onPlayAudio, onSetFavorite, onRename, onShowProperties, onViewTranscription, allTranscriptions }) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(audio.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
        inputRef.current?.focus();
        inputRef.current?.select();
    }
  }, [isRenaming]);

  const handleRenameConfirm = () => {
    if (newName.trim() && newName.trim() !== audio.name) {
        onRename(audio.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRenameConfirm();
    if (e.key === 'Escape') {
        setNewName(audio.name);
        setIsRenaming(false);
    }
  };

  const linkedTranscription = allTranscriptions.find(t => t.audioId === audio.id);

  // FIX: Refactored the `dropdownOptions` array construction to be a single expression. This allows TypeScript to correctly infer the type of the array elements, including the optional `className` property, resolving the type error.
  const dropdownOptions = [
    { label: 'Renomear', icon: <EditIcon className="w-4 h-4" />, onClick: () => setIsRenaming(true) },
    { label: 'Propriedades', icon: <InfoIcon className="w-4 h-4" />, onClick: onShowProperties },
    ...(linkedTranscription ? [{
        label: 'Ver Transcrição',
        icon: <InfoIcon className="w-4 h-4" />,
        onClick: () => onViewTranscription(linkedTranscription.id),
    }] : []),
    { label: 'Transcrever', icon: <SparkleIcon className="w-4 h-4" />, onClick: onTranscribe },
    { label: audio.isFavorite ? 'Remover Favorito' : 'Adicionar Favorito', icon: audio.isFavorite ? <StarIcon className="w-4 h-4 text-yellow-500" /> : <StarOutlineIcon className="w-4 h-4" />, onClick: () => onSetFavorite(!audio.isFavorite) },
    { label: 'Apagar', icon: <TrashIcon className="w-4 h-4" />, onClick: onDelete, className: 'text-red-600 dark:text-red-400' }
  ];

  return (
    <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center flex-1 min-w-0">
          <button
              onClick={() => onPlayAudio(audio)}
              aria-label="Reproduzir áudio"
              title="Reproduzir áudio"
              className="p-2 mr-2 rounded-full text-gray-400 hover:text-[#24a9c5] hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] dark:focus:ring-offset-gray-800"
          >
              <PlayIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {isRenaming ? (
                 <input
                    ref={inputRef}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={handleRenameConfirm}
                    onKeyDown={handleRenameKeyDown}
                    className="font-semibold text-gray-800 dark:text-gray-200 bg-transparent border-b-2 border-[#24a9c5] focus:outline-none w-full"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={audio.name}>
                    {audio.name}
                </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(audio.date).toLocaleString('pt-PT', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          </div>
        </div>
        <div className="flex items-center ml-2 flex-shrink-0">
            <DropdownMenu
                options={dropdownOptions}
                trigger={
                    <span className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <MoreVerticalIcon className="w-5 h-5" />
                    </span>
                }
            />
        </div>
    </div>
  );
};

interface RecordingsPageProps {
  onTranscribe: (audio: AudioRecording) => void;
  onPlayAudio: (audio: AudioRecording) => void;
}

export const RecordingsPage: React.FC<RecordingsPageProps> = ({ onTranscribe, onPlayAudio }) => {
  const [allAudioFiles, setAllAudioFiles] = useState<AudioRecording[]>([]);
  const [allTranscriptions, setAllTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertiesItem, setPropertiesItem] = useState<AudioRecording | null>(null);
  const [retranscribeConfirm, setRetranscribeConfirm] = useState<AudioRecording | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [audioData, transcriptionsData] = await Promise.all([
          getAllAudioFiles(),
          getAllTranscriptions(),
      ]);
      setAllAudioFiles(audioData);
      setAllTranscriptions(transcriptionsData);
    } catch (err) {
      setError('Não foi possível carregar o histórico de gravações.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRecording = async (audioBlob: Blob) => {
    const timestamp = new Date();
    
    // Dynamically determine file extension from Blob's MIME type
    const getFileExtension = (mimeType: string): string => {
        if (!mimeType) return 'wav'; // Default fallback
        // e.g., 'audio/webm;codecs=opus' -> 'webm'
        const subtype = mimeType.split('/')[1]?.split(';')[0];
        // Use .m4a for mp4 audio files, which is a common convention
        if (subtype === 'mp4') {
            return 'm4a';
        }
        return subtype || 'wav'; // Fallback for cases like 'audio/' or malformed types
    };
    const extension = getFileExtension(audioBlob.type);
    const recordingName = `Gravação - ${timestamp.toLocaleString('pt-PT').replace(/,/, '')}.${extension}`;

    try {
        await addAudioFile({
            id: `audio-${timestamp.getTime()}-${recordingName}`,
            name: recordingName,
            date: timestamp.getTime(),
            type: 'recording',
            audioBlob: audioBlob,
            isFavorite: false,
        });
        loadData(); // Refresh list after saving
    } catch (err) {
        setError('Falha ao guardar a gravação.');
        console.error(err);
    }
  };

  const promptForDelete = (id: string) => {
    setDeleteTargetId(id);
  };
  
  const handleViewTranscription = (transcriptionId: string) => {
    sessionStorage.setItem('highlightTranscriptionId', transcriptionId);
    window.location.hash = '#/history';
  };

  const handleSetFavorite = async (id: string, isFavorite: boolean) => {
    try {
        await updateAudioFile(id, { isFavorite });
        setAllAudioFiles(prev => prev.map(a => a.id === id ? { ...a, isFavorite } : a));
    } catch (err) {
        alert('Ocorreu um erro ao atualizar o estado de favorito.');
        console.error(err);
    }
  };

  const handleRename = async (id: string, newName: string) => {
    try {
        await updateAudioFile(id, { name: newName });
        setAllAudioFiles(prev => prev.map(a => a.id === id ? { ...a, name: newName } : a));
    } catch (err) {
        alert('Ocorreu um erro ao renomear o ficheiro.');
        console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;

    setIsDeleting(true);
    try {
      await deleteAudioFile(deleteTargetId);
      setAllAudioFiles((prev) => prev.filter((a) => a.id !== deleteTargetId));
    } catch (err) {
      alert('Ocorreu um erro ao apagar o ficheiro de áudio.');
      console.error(err);
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const handleTranscribeRequest = (audio: AudioRecording) => {
    const existingTranscription = allTranscriptions.find(t => t.audioId === audio.id);
    if (existingTranscription) {
        setRetranscribeConfirm(audio);
    } else {
        onTranscribe(audio);
    }
  };

  const handleConfirmRetranscribe = () => {
    if (retranscribeConfirm) {
        onTranscribe(retranscribeConfirm);
        setRetranscribeConfirm(null);
    }
  };

  const { uploads, recordings } = useMemo(() => {
    const filteredFiles = searchQuery
      ? allAudioFiles.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : allAudioFiles;

    return filteredFiles.reduce(
      (acc, file) => {
        if (file.type === 'upload') {
          acc.uploads.push(file);
        } else {
          acc.recordings.push(file);
        }
        return acc;
      },
      { uploads: [] as AudioRecording[], recordings: [] as AudioRecording[] }
    );
  }, [allAudioFiles, searchQuery]);

  return (
    <>
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">
            Gravações
          </h1>
          <div className="lg:grid lg:grid-cols-3 lg:gap-8 items-start">
            <div className="lg:col-span-1 lg:sticky lg:top-24">
              <div className="mb-8">
                <VoiceRecorder onSave={handleSaveRecording} />
              </div>
            </div>
            <div className="lg:col-span-2 mt-8 lg:mt-0">
              <div className="mb-8 relative">
                <input
                  type="search"
                  placeholder="Pesquisar por nome do ficheiro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-gray-700 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#24a9c5] dark:bg-gray-800/80 dark:text-gray-200 dark:border-gray-600 dark:placeholder-gray-400"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>

              {isLoading && (
                <div className="flex justify-center items-center py-10">
                  <Loader className="w-10 h-10 text-[#24a9c5]" />
                </div>
              )}

              {error && (
                  <div className="text-center text-red-800 bg-red-100 p-4 rounded-lg border border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800/50">
                      {error}
                  </div>
              )}

              {!isLoading && !error && (
                <div className="space-y-8">
                  {/* Uploaded Files Section */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Ficheiros Carregados
                    </h2>
                    {uploads.length > 0 ? (
                      <div className="space-y-3">
                        {uploads.map((audio) => (
                          <AudioItem 
                            key={audio.id} 
                            audio={audio} 
                            onDelete={() => promptForDelete(audio.id)} 
                            onTranscribe={() => handleTranscribeRequest(audio)}
                            onPlayAudio={onPlayAudio}
                            onSetFavorite={(isFav) => handleSetFavorite(audio.id, isFav)}
                            onRename={handleRename}
                            onShowProperties={() => setPropertiesItem(audio)}
                            allTranscriptions={allTranscriptions}
                            onViewTranscription={handleViewTranscription}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        {searchQuery ? `Nenhum ficheiro carregado encontrado para "${searchQuery}".` : 'Nenhum ficheiro carregado foi encontrado.'}
                      </p>
                    )}
                  </div>

                  {/* Saved Recordings Section */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                      Gravações Salvas
                    </h2>
                    {recordings.length > 0 ? (
                      <div className="space-y-3">
                        {recordings.map((audio) => (
                          <AudioItem 
                            key={audio.id} 
                            audio={audio} 
                            onDelete={() => promptForDelete(audio.id)} 
                            onTranscribe={() => handleTranscribeRequest(audio)} 
                            onPlayAudio={onPlayAudio}
                            onSetFavorite={(isFav) => handleSetFavorite(audio.id, isFav)}
                            onRename={handleRename}
                            onShowProperties={() => setPropertiesItem(audio)}
                            allTranscriptions={allTranscriptions}
                            onViewTranscription={handleViewTranscription}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        {searchQuery ? `Nenhuma gravação encontrada para "${searchQuery}".` : 'Nenhuma gravação foi encontrada.'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
      </main>
      <ConfirmationModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        title="Apagar Ficheiro de Áudio"
        message="Tem a certeza de que deseja apagar permanentemente este ficheiro de áudio? Esta ação não pode ser desfeita."
      />
      <ConfirmationModal
        isOpen={!!retranscribeConfirm}
        onClose={() => setRetranscribeConfirm(null)}
        onConfirm={handleConfirmRetranscribe}
        isConfirming={false}
        title="Substituir Transcrição"
        message="Este áudio já foi transcrito. Iniciar um novo processo irá apagar a transcrição antiga permanentemente. Deseja continuar?"
      />
      <PropertiesModal item={propertiesItem} onClose={() => setPropertiesItem(null)} />
    </>
  );
};