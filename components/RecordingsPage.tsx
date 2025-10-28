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

    const existingTranscription = useMemo(() => allTranscriptions.find(t => t.audioId === audio.id), [allTranscriptions, audio.id]);

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
        { label: existingTranscription ? 'Ver Transcrição' : 'Transcrever', icon: <SparkleIcon className="w-4 h-4" />, onClick: existingTranscription ? () => onViewTranscription(existingTranscription.id) : onTranscribe },
        { label: audio.isFavorite ? 'Remover Favorito' : 'Adicionar Favorito', icon: audio.isFavorite ? <StarIcon className="w-4 h-4 text-yellow-500" /> : <StarOutlineIcon className="w-4 h-4" />, onClick: () => onSetFavorite(!audio.isFavorite) },
        { label: 'Apagar', icon: <TrashIcon className="w-4 h-4" />, onClick: onDelete, className: 'text-red-600 dark:text-red-400' },
    ];

  return (
    <div className={`flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${existingTranscription ? 'opacity-70' : ''}`}>
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
    const [audioFiles, setAudioFiles] = useState<AudioRecording[]>([]);
    const [allTranscriptions, setAllTranscriptions] = useState<Transcription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [propertiesItem, setPropertiesItem] = useState<AudioRecording | null>(null);
    const [retranscribeConfirm, setRetranscribeConfirm] = useState<AudioRecording | null>(null);

    const loadData = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [audioData, transcriptionData] = await Promise.all([
                getAllAudioFiles(),
                getAllTranscriptions()
            ]);
            setAudioFiles(audioData);
            setAllTranscriptions(transcriptionData);
        } catch (err) {
            setError('Não foi possível carregar os seus ficheiros de áudio.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveRecording = async (audioBlob: Blob) => {
        const fileExtension = audioBlob.type.split('/')[1]?.split(';')[0] || 'wav';
        const newAudio: AudioRecording = {
            id: `recording-${Date.now()}`,
            name: `Gravação-${new Date().toISOString().slice(0, 19).replace('T', '_')}.${fileExtension}`,
            date: Date.now(),
            type: 'recording',
            audioBlob: audioBlob,
            isFavorite: false,
        };
        await addAudioFile(newAudio);
        loadData(); // Refresh list
    };
    
    const handleSetFavorite = async (id: string, isFavorite: boolean) => {
        await updateAudioFile(id, { isFavorite });
        loadData();
    };
    
    const handleRename = async (id: string, newName: string) => {
        await updateAudioFile(id, { name: newName });
        loadData();
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        await deleteAudioFile(deleteTarget);
        setIsDeleting(false);
        setDeleteTarget(null);
        loadData();
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
    
    const handleViewTranscription = (id: string) => {
        sessionStorage.setItem('highlightTranscriptionId', id);
        window.location.hash = '#/history';
    };

    const filteredAudioFiles = useMemo(() => {
        if (!searchQuery.trim()) {
            return audioFiles;
        }
        return audioFiles.filter(audio =>
            audio.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [audioFiles, searchQuery]);

    return (
        <>
            <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">
                        Gravações
                    </h1>

                    <div className="mb-8">
                        <VoiceRecorder onSave={handleSaveRecording} />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                         <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Áudios Guardados</h2>
                        <div className="relative flex-shrink-0 w-full sm:w-64">
                            <input type="search" placeholder="Pesquisar gravações..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm text-gray-700 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#24a9c5] dark:bg-gray-800/80 dark:text-gray-200 dark:border-gray-600"/>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="w-5 h-5 text-gray-400" /></div>
                        </div>
                    </div>

                    {isLoading && <div className="flex justify-center py-10"><Loader className="w-10 h-10 text-[#24a9c5]" /></div>}
                    {error && <div className="text-center text-red-800 bg-red-100 p-4 rounded-lg">{error}</div>}

                    {!isLoading && !error && audioFiles.length === 0 && (
                        <div className="text-center py-20">
                            <img src={longaniLogoUrl} alt="Longani Logo" className="h-16 mx-auto mb-4 opacity-30 pointer-events-none" />
                            <p className="text-lg text-gray-600 dark:text-gray-400">Nenhuma gravação encontrada.</p>
                            <p className="text-gray-500 dark:text-gray-500">Use o gravador acima para começar.</p>
                        </div>
                    )}

                     {!isLoading && !error && audioFiles.length > 0 && filteredAudioFiles.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-gray-600 dark:text-gray-400">Nenhum resultado encontrado para a sua pesquisa.</p>
                        </div>
                    )}
                    
                    {!isLoading && !error && filteredAudioFiles.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredAudioFiles.map((audio) => (
                            <AudioItem
                                key={audio.id}
                                audio={audio}
                                onDelete={() => setDeleteTarget(audio.id)}
                                onTranscribe={() => handleTranscribeRequest(audio)}
                                onPlayAudio={onPlayAudio}
                                onSetFavorite={(isFav) => handleSetFavorite(audio.id, isFav)}
                                onRename={handleRename}
                                onShowProperties={() => setPropertiesItem(audio)}
                                onViewTranscription={handleViewTranscription}
                                allTranscriptions={allTranscriptions}
                            />
                        ))}
                        </div>
                    )}
                </div>
            </main>
            <ConfirmationModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                isConfirming={isDeleting}
                title="Apagar Gravação"
                message="Tem a certeza de que deseja apagar permanentemente esta gravação? Esta ação não pode ser desfeita."
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
