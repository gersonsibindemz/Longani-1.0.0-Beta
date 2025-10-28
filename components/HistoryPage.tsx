import React, { useState, useEffect, useCallback } from 'react';
import { getAllTranscriptions, updateTranscription, deleteTranscription, addTranslation, updateProfileTeamId, getUserTeam } from '../utils/db';
import { Transcription, TeamWithMembers } from '../types';
import { Loader } from './Loader';
import { DropdownMenu } from './DropdownMenu';
import { MoreVerticalIcon, EditIcon, StarIcon, StarOutlineIcon, TrashIcon, TranslateIcon, UsersIcon, HistoryIcon } from './Icons';
import { ConfirmationModal } from './ConfirmationModal';
import { PropertiesModal } from './PropertiesModal';
import { translateText } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Renomear Transcrição</h3>
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

export const HistoryPage: React.FC = () => {
    const { profile } = useAuth();
    const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [team, setTeam] = useState<TeamWithMembers | null>(null);

    const [itemToDelete, setItemToDelete] = useState<Transcription | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [itemToRename, setItemToRename] = useState<Transcription | null>(null);

    const [itemForProperties, setItemForProperties] = useState<Transcription | null>(null);
    
    const [isTranslating, setIsTranslating] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getAllTranscriptions();
            setTranscriptions(data);
            if (profile) {
                const userTeam = await getUserTeam(profile.id);
                setTeam(userTeam);
            }
        } catch (err) {
            setError('Não foi possível carregar as transcrições.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleFavorite = async (item: Transcription) => {
        try {
            await updateTranscription(item.id, { is_favorite: !item.is_favorite });
            fetchData();
        } catch (err) {
            console.error("Failed to update favorite status", err);
        }
    };

    const handleRename = async (newName: string) => {
        if (!itemToRename) return;
        try {
            await updateTranscription(itemToRename.id, { filename: newName });
            fetchData();
        } catch (err) {
            console.error("Failed to rename", err);
        }
    };
    
    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            await deleteTranscription(itemToDelete.id);
            setItemToDelete(null);
            fetchData();
        } catch (err) {
            console.error("Failed to delete", err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTranslate = async (item: Transcription) => {
        if (!item.cleaned_transcript) return;
        setIsTranslating(item.id);
        try {
            let fullTranslation = '';
            for await (const chunk of translateText(item.cleaned_transcript, 'en')) {
                fullTranslation += chunk;
            }
            await addTranslation({
                transcription_id: item.id,
                user_id: item.user_id,
                original_filename: item.filename,
                target_language: 'en',
                translated_text: fullTranslation
            });
            alert('Tradução guardada com sucesso!');
        } catch (err) {
            console.error("Failed to translate", err);
            alert('Ocorreu um erro ao traduzir.');
        } finally {
            setIsTranslating(null);
        }
    };
    
    const handleShareWithTeam = async (item: Transcription) => {
        if (!team) return;
        try {
            await updateTranscription(item.id, { team_id: team.id, shared_by_name: profile?.name });
            fetchData();
        } catch (err) {
            console.error("Failed to share with team", err);
        }
    };

    const handleRemoveFromTeam = async (item: Transcription) => {
        try {
            await updateTranscription(item.id, { team_id: null, shared_by_name: null });
            fetchData();
        } catch (err) {
            console.error("Failed to remove from team", err);
        }
    };

    const handleEdit = (id: string) => {
        sessionStorage.setItem('loadTranscriptionId', id);
        window.location.hash = '#/home';
    };
    
    const highlightId = sessionStorage.getItem('highlightTranscriptionId');
    if (highlightId) {
        sessionStorage.removeItem('highlightTranscriptionId');
    }

    const renderList = (title: string, data: Transcription[]) => (
        <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h2>
            {data.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Nenhuma transcrição encontrada.</p>
            ) : (
                <ul className="bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                    {data.map((item) => (
                        <li key={item.id} className={`flex items-center justify-between p-4 ${highlightId === item.id ? 'animate-highlight-flash' : ''}`}>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.filename}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(item.created_at).toLocaleString('pt-PT')}
                                    {item.team_id && item.shared_by_name && <span className="ml-2"> (Partilhado por {item.shared_by_name})</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                {isTranslating === item.id && <Loader className="w-5 h-5 text-cyan-500" />}
                                <button onClick={() => handleToggleFavorite(item)} className="p-2 text-gray-400 hover:text-yellow-500">
                                    {item.is_favorite ? <StarIcon className="w-5 h-5 text-yellow-400" /> : <StarOutlineIcon className="w-5 h-5" />}
                                </button>
                                <DropdownMenu
                                    trigger={<button className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"><MoreVerticalIcon className="w-5 h-5"/></button>}
                                    options={[
                                        { label: 'Editar', icon: <EditIcon className="w-4 h-4" />, onClick: () => handleEdit(item.id) },
                                        { label: 'Renomear', icon: <EditIcon className="w-4 h-4" />, onClick: () => setItemToRename(item) },
                                        { label: 'Traduzir (Inglês)', icon: <TranslateIcon className="w-4 h-4" />, onClick: () => handleTranslate(item), disabled: !item.cleaned_transcript },
                                        team ? (item.team_id ? 
                                            { label: 'Remover da Equipa', icon: <UsersIcon className="w-4 h-4" />, onClick: () => handleRemoveFromTeam(item) } :
                                            { label: 'Partilhar com Equipa', icon: <UsersIcon className="w-4 h-4" />, onClick: () => handleShareWithTeam(item) }
                                        ) : { label: 'Partilhar com Equipa', icon: <UsersIcon className="w-4 h-4" />, disabled: true },
                                        { label: 'Propriedades', icon: <HistoryIcon className="w-4 h-4" />, onClick: () => setItemForProperties(item) },
                                        { label: 'Apagar', icon: <TrashIcon className="w-4 h-4" />, onClick: () => setItemToDelete(item), className: 'text-red-600 dark:text-red-500' },
                                    ]}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
    
    if (isLoading) {
        return <div className="flex-grow flex items-center justify-center"><Loader className="w-8 h-8 text-[#24a9c5]" /></div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-600">{error}</div>;
    }
    
    const myTranscriptions = transcriptions.filter(t => t.user_id === profile?.id);
    const teamTranscriptions = transcriptions.filter(t => t.user_id !== profile?.id && t.team_id === team?.id);

    return (
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Minhas Transcrições</h1>
            {renderList("Minhas", myTranscriptions)}
            {team && renderList("Partilhadas Comigo", teamTranscriptions)}

            <ConfirmationModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={handleDelete}
                title="Apagar Transcrição"
                message={`Tem a certeza que deseja apagar permanentemente "${itemToDelete?.filename}"? Esta ação não pode ser desfeita.`}
                isConfirming={isDeleting}
            />
            <RenameModal
                isOpen={!!itemToRename}
                onClose={() => setItemToRename(null)}
                onSave={handleRename}
                currentName={itemToRename?.filename || ''}
            />
            <PropertiesModal
                item={itemForProperties}
                onClose={() => setItemForProperties(null)}
            />
        </main>
    );
}