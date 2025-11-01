import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceRecorder } from './VoiceRecorder';
import { getAllAudioFiles, addAudioFile, deleteAudioFile, updateAudioFile, getAudioRecording } from '../utils/db';
import { AudioFile, AudioRecording } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from './Loader';
import { DropdownMenu } from './DropdownMenu';
import { MoreVerticalIcon, EditIcon, StarIcon, StarOutlineIcon, TrashIcon, WaveformIcon, PlayIcon, UploadIcon, CheckIcon } from './Icons';
import { ConfirmationModal } from './ConfirmationModal';
import { PropertiesModal } from './PropertiesModal';
import { formatPlayerTime, getFriendlyErrorMessage } from '../utils/audioUtils';

const RenameModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (newName: string) => Promise<void>; currentName: string }> = ({ isOpen, onClose, onSave, currentName }) => {
    const [name, setName] = useState(currentName);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) setName(currentName);
    }, [isOpen, currentName]);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(name);
        setIsSaving(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div role="dialog" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Renomear Gravação</h3>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-4 w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-[#24a9c5] border border-transparent rounded-md hover:bg-[#1e8a9f] disabled:opacity-50">
                        {isSaving ? <Loader className="w-5 h-5"/> : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface RecordingsPageProps {
    onTranscribe: (audio: AudioRecording) => void;
    onPlayAudio: (audio: AudioRecording) => void;
    uploadDisabled?: boolean;
}

export const RecordingsPage: React.FC<RecordingsPageProps> = ({ onTranscribe, onPlayAudio, uploadDisabled }) => {
    const { profile } = useAuth();
    const [recordings, setRecordings] = useState<AudioFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [itemToDelete, setItemToDelete] = useState<AudioFile | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [itemToRename, setItemToRename] = useState<AudioFile | null>(null);
    const [itemForProperties, setItemForProperties] = useState<AudioRecording | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // Track ID of item being acted upon

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getAllAudioFiles();
            setRecordings(data);
        } catch (err) {
            setError('Não foi possível carregar as gravações.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveRecording = async (audioBlob: Blob) => {
        if (!profile) return;
        const fileName = `Gravação-${new Date().toLocaleString('pt-PT').replace(/[\/:]/g, '-')}.mp4`;
        try {
            await addAudioFile({ name: fileName, audioBlob }, profile.id);
            fetchData();
        } catch (err) {
            console.error("Failed to save recording", err);
            setError(getFriendlyErrorMessage(err));
        }
    };
    
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0 || !profile) return;

        setIsUploading(true);
        setError(null);

        const uploadPromises = Array.from(files).map(file =>
            addAudioFile({ name: file.name, audioBlob: file }, profile.id)
        );

        try {
            await Promise.all(uploadPromises);
        } catch (err) {
            console.error("Failed to upload files", err);
            setError(getFriendlyErrorMessage(err));
        } finally {
            setIsUploading(false);
            fetchData(); // Refresh the list
            // Reset the input value to allow selecting the same file again
            if (event.target) {
                event.target.value = '';
            }
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await deleteAudioFile(itemToDelete.id);
            setItemToDelete(null);
            fetchData();
        } catch (err) {
            console.error("Failed to delete", err);
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleToggleFavorite = async (item: AudioFile) => {
        try {
            await updateAudioFile(item.id, { is_favorite: !item.is_favorite });
            fetchData();
        } catch (err) {
            console.error("Failed to update favorite status", err);
        }
    };

    const handleRename = async (newName: string) => {
        if (!itemToRename) return;
        try {
            await updateAudioFile(itemToRename.id, { name: newName });
            fetchData();
        } catch (err) {
            console.error("Failed to rename", err);
        }
    };

    const performAction = async (itemId: string, action: 'transcribe' | 'play' | 'properties') => {
        setActionLoading(itemId);
        try {
            const recording = await getAudioRecording(itemId);
            if (!recording) {
                throw new Error("Gravação não encontrada.");
            }
            if (action === 'transcribe') onTranscribe(recording);
            if (action === 'play') onPlayAudio(recording);
            if (action === 'properties') setItemForProperties(recording);
        } catch (err) {
            console.error(`Failed to perform action ${action}`, err);
            setError(getFriendlyErrorMessage(err));
        } finally {
            setActionLoading(null);
        }
    };

    if (isLoading) {
        return <div className="flex-grow flex items-center justify-center"><Loader className="w-8 h-8 text-[#24a9c5]" /></div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-600">{error}</div>;
    }

    const uploadedFiles = recordings.filter(r => !r.name.startsWith('Gravação-'));
    const savedRecordings = recordings.filter(r => r.name.startsWith('Gravação-'));

    const renderList = (title: string, data: AudioFile[]) => (
         <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h2>
            {data.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Nenhum ficheiro encontrado.</p>
            ) : (
                <ul className="bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.map((item) => (
                        <li key={item.id} className="flex items-center justify-between p-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
                                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" title="Guardado na nuvem" />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(item.created_at).toLocaleString('pt-PT')}
                                    <span className="mx-2">•</span>
                                    {formatPlayerTime(item.duration_seconds)}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                {actionLoading === item.id ? <Loader className="w-5 h-5 text-cyan-500" /> : (
                                    <>
                                        <button onClick={() => handleToggleFavorite(item)} className="p-2 text-gray-400 hover:text-yellow-500">
                                            {item.is_favorite ? <StarIcon className="w-5 h-5 text-yellow-400" /> : <StarOutlineIcon className="w-5 h-5" />}
                                        </button>
                                        <DropdownMenu
                                            trigger={<button className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"><MoreVerticalIcon className="w-5 h-5"/></button>}
                                            options={[
                                                { label: 'Transcrever', icon: <WaveformIcon className="w-4 h-4" />, onClick: () => performAction(item.id, 'transcribe') },
                                                { label: 'Reproduzir', icon: <PlayIcon className="w-4 h-4" />, onClick: () => performAction(item.id, 'play') },
                                                { label: 'Renomear', icon: <EditIcon className="w-4 h-4" />, onClick: () => setItemToRename(item) },
                                                { label: 'Propriedades', icon: <WaveformIcon className="w-4 h-4" />, onClick: () => performAction(item.id, 'properties') },
                                                { label: 'Apagar', icon: <TrashIcon className="w-4 h-4" />, onClick: () => setItemToDelete(item), className: 'text-red-600 dark:text-red-500' },
                                            ]}
                                        />
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );

    return (
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="audio/*"
                multiple
                disabled={isUploading || uploadDisabled}
            />
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">
                        Gravações
                    </h1>
                     <div className="text-right">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || uploadDisabled}
                            className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#24a9c5] hover:bg-[#1e8a9f] disabled:opacity-50"
                            title={uploadDisabled ? "Disponível nos planos pagos" : "Carregar ficheiros de áudio do dispositivo"}
                        >
                            {isUploading ? <Loader className="w-5 h-5" /> : <UploadIcon className="w-5 h-5" />}
                            <span>Carregar</span>
                        </button>
                        {uploadDisabled && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Disponível nos planos pagos
                            </p>
                        )}
                    </div>
                </div>
                <div className="mb-8">
                    <VoiceRecorder onSave={handleSaveRecording} />
                </div>
                {renderList("Ficheiros Carregados", uploadedFiles)}
                {renderList("Gravações Salvas", savedRecordings)}
            </div>

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDelete}
                title="Apagar Gravação"
                message={`Tem a certeza que deseja apagar permanentemente "${itemToDelete?.name}"? Esta ação não pode ser desfeita.`}
                isConfirming={isDeleting}
            />
             <RenameModal
                isOpen={!!itemToRename}
                onClose={() => setItemToRename(null)}
                onSave={handleRename}
                currentName={itemToRename?.name || ''}
            />
            <PropertiesModal
                item={itemForProperties}
                onClose={() => setItemForProperties(null)}
            />
        </main>
    );
};