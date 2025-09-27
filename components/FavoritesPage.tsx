import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    getAllFavorites, 
    deleteTranscription, 
    updateTranscription, 
    deleteAudioFile,
    updateAudioFile,
    Transcription, 
    AudioRecording
} from '../utils/db';
import { Loader } from './Loader';
import { TrashIcon, SparkleIcon, PlayIcon, StarIcon, MoreVerticalIcon, EditIcon, InfoIcon } from './Icons';
import { longaniLogoUrl } from './Header';
import { ConfirmationModal } from './ConfirmationModal';
import { DropdownMenu } from './DropdownMenu';
import { PropertiesModal } from './PropertiesModal';

type FavoriteFilter = 'all' | 'transcriptions' | 'recordings';

interface FavoritesPageProps {
  onTranscribe: (audio: AudioRecording) => void;
  onPlayAudio: (audio: AudioRecording) => void;
}

const FavoriteTranscriptionItem: React.FC<{
  transcript: Transcription;
  onDelete: () => void;
  onSetFavorite: (isFavorite: boolean) => void;
  onRename: (id: string, newName: string) => void;
  onShowProperties: () => void;
}> = ({ transcript, onDelete, onSetFavorite, onRename, onShowProperties }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(transcript.filename);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isRenaming) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isRenaming]);

    const handleRenameConfirm = () => {
        if (newName.trim() && newName.trim() !== transcript.filename) {
            onRename(transcript.id, newName.trim());
        }
        setIsRenaming(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleRenameConfirm();
        if (e.key === 'Escape') {
            setNewName(transcript.filename);
            setIsRenaming(false);
        }
    };
    
    const dropdownOptions = [
        { label: 'Renomear', icon: <EditIcon className="w-4 h-4" />, onClick: () => setIsRenaming(true) },
        { label: 'Propriedades', icon: <InfoIcon className="w-4 h-4" />, onClick: onShowProperties },
        { label: 'Ver Detalhes', icon: <InfoIcon className="w-4 h-4" />, onClick: () => window.location.hash = '#/history' },
        { label: 'Remover Favorito', icon: <StarIcon className="w-4 h-4 text-yellow-500" />, onClick: () => onSetFavorite(false) },
        { label: 'Apagar', icon: <TrashIcon className="w-4 h-4" />, onClick: onDelete, className: 'text-red-600 dark:text-red-400' },
    ];


  return (
    <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
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
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-2" title={transcript.filename}>
                    {transcript.filename}
                </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(transcript.date).toLocaleString('pt-PT', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
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

const FavoriteAudioItem: React.FC<{
  audio: AudioRecording;
  onDelete: () => void;
  onTranscribe: () => void;
  onPlayAudio: (audio: AudioRecording) => void;
  onSetFavorite: (isFavorite: boolean) => void;
  onRename: (id: string, newName: string) => void;
  onShowProperties: () => void;
}> = ({ audio, onDelete, onTranscribe, onPlayAudio, onSetFavorite, onRename, onShowProperties }) => {
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

    const dropdownOptions = [
        { label: 'Renomear', icon: <EditIcon className="w-4 h-4" />, onClick: () => setIsRenaming(true) },
        { label: 'Propriedades', icon: <InfoIcon className="w-4 h-4" />, onClick: onShowProperties },
        { label: 'Transcrever', icon: <SparkleIcon className="w-4 h-4" />, onClick: onTranscribe },
        { label: 'Remover Favorito', icon: <StarIcon className="w-4 h-4 text-yellow-500" />, onClick: () => onSetFavorite(false) },
        { label: 'Apagar', icon: <TrashIcon className="w-4 h-4" />, onClick: onDelete, className: 'text-red-600 dark:text-red-400' },
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


export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onTranscribe, onPlayAudio }) => {
  const [transcripts, setTranscripts] = useState<Transcription[]>([]);
  const [audioFiles, setAudioFiles] = useState<AudioRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FavoriteFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<{id: string; type: 'transcription' | 'audio'} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [propertiesItem, setPropertiesItem] = useState<Transcription | AudioRecording | null>(null);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { transcriptions, audioFiles } = await getAllFavorites();
      setTranscripts(transcriptions);
      setAudioFiles(audioFiles);
    } catch (err) {
      setError('Não foi possível carregar os seus favoritos.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleSetTranscriptionFavorite = async (id: string, isFavorite: boolean) => {
    await updateTranscription(id, { isFavorite });
    loadFavorites(); // a simple refresh is easiest
  };

  const handleSetAudioFavorite = async (id: string, isFavorite: boolean) => {
    await updateAudioFile(id, { isFavorite });
    loadFavorites(); // a simple refresh is easiest
  };

  const handleRenameTranscription = async (id: string, newName: string) => {
    await updateTranscription(id, { filename: newName });
    loadFavorites();
  };

  const handleRenameAudio = async (id: string, newName: string) => {
    await updateAudioFile(id, { name: newName });
    loadFavorites();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'transcription') {
        await deleteTranscription(deleteTarget.id);
      } else {
        await deleteAudioFile(deleteTarget.id);
      }
      loadFavorites(); // Refresh list after deleting
    } catch (err) {
      alert('Ocorreu um erro ao apagar o item.');
      console.error(err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const { filteredTranscripts, filteredAudioFiles } = useMemo(() => {
    return {
        filteredTranscripts: filter === 'all' || filter === 'transcriptions' ? transcripts : [],
        filteredAudioFiles: filter === 'all' || filter === 'recordings' ? audioFiles : [],
    }
  }, [filter, transcripts, audioFiles]);

  const hasFavorites = transcripts.length > 0 || audioFiles.length > 0;
  const hasResults = filteredTranscripts.length > 0 || filteredAudioFiles.length > 0;


  return (
    <>
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">
            Favoritos
          </h1>

          {hasFavorites && (
            <div className="mb-6 flex flex-wrap gap-2">
                <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${filter === 'all' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>
                    Ambos
                </button>
                <button onClick={() => setFilter('transcriptions')} className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${filter === 'transcriptions' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>
                    Transcrições
                </button>
                <button onClick={() => setFilter('recordings')} className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${filter === 'recordings' ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}>
                    Gravações
                </button>
            </div>
          )}
          
          {isLoading && <div className="flex justify-center py-10"><Loader className="w-10 h-10 text-[#24a9c5]" /></div>}
          {error && <div className="text-center text-red-800 bg-red-100 p-4 rounded-lg">{error}</div>}

          {!isLoading && !error && !hasFavorites && (
             <div className="text-center py-20">
                <div className="flex justify-center items-center" aria-hidden="true">
                    <StarIcon className="w-24 h-24 text-gray-200 dark:text-gray-700" />
                </div>
                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Nenhum favorito encontrado.</p>
                <p className="text-gray-500 dark:text-gray-500">Clique no ícone de estrela para adicionar um item aos favoritos.</p>
            </div>
          )}

          {!isLoading && !error && hasFavorites && !hasResults && (
            <div className="text-center py-10">
                <p className="text-gray-600 dark:text-gray-400">Nenhum favorito encontrado para este filtro.</p>
            </div>
          )}
          
          {!isLoading && !error && hasResults && (
            <div className="space-y-8">
                {filteredTranscripts.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Transcrições Favoritas
                        </h2>
                        <div className="space-y-3">
                            {filteredTranscripts.map((t) => (
                                <FavoriteTranscriptionItem 
                                    key={t.id} 
                                    transcript={t} 
                                    onDelete={() => setDeleteTarget({id: t.id, type: 'transcription'})}
                                    onSetFavorite={(isFav) => handleSetTranscriptionFavorite(t.id, isFav)}
                                    onRename={handleRenameTranscription}
                                    onShowProperties={() => setPropertiesItem(t)}
                                />
                            ))}
                        </div>
                    </div>
                )}
                {filteredAudioFiles.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            Gravações Favoritas
                        </h2>
                        <div className="space-y-3">
                            {filteredAudioFiles.map((audio) => (
                                <FavoriteAudioItem
                                    key={audio.id}
                                    audio={audio}
                                    onDelete={() => setDeleteTarget({id: audio.id, type: 'audio'})}
                                    onTranscribe={() => onTranscribe(audio)}
                                    onPlayAudio={onPlayAudio}
                                    onSetFavorite={(isFav) => handleSetAudioFavorite(audio.id, isFav)}
                                    onRename={handleRenameAudio}
                                    onShowProperties={() => setPropertiesItem(audio)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
          )}
        </div>
      </main>
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        title="Apagar Item"
        message="Tem a certeza de que deseja apagar permanentemente este item? Esta ação não pode ser desfeita."
      />
      <PropertiesModal item={propertiesItem} onClose={() => setPropertiesItem(null)} />
    </>
  );
};