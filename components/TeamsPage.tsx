import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from './Loader';
import { UsersIcon, UserIcon, TrashIcon } from './Icons';
import { TeamWithMembers } from '../types';
import { getUserTeam, createTeam, updateProfileTeamId, inviteUserToTeam } from '../utils/db';
import { ConfirmationModal } from './ConfirmationModal';
import { InviteMemberModal } from './InviteMemberModal';

export const TeamsPage: React.FC = () => {
    const { profile, updateProfile } = useAuth();
    const [team, setTeam] = useState<TeamWithMembers | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreatingTeam, setIsCreatingTeam] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    
    const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const isOwner = profile?.id === team?.owner_id;

    const fetchTeamData = useCallback(async () => {
        if (!profile) return;
        setIsLoading(true);
        setError(null);
        try {
            const userTeam = await getUserTeam(profile.id);
            setTeam(userTeam);
        } catch (err) {
            setError('Não foi possível carregar os dados da equipa.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        fetchTeamData();
    }, [fetchTeamData]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim() || !profile) return;
        setIsCreatingTeam(true);
        try {
            const newTeam = await createTeam(newTeamName, profile.id);
            await updateProfile({ team_id: newTeam.id });
        } catch (err) {
            console.error(err);
            setError('Não foi possível criar a equipa.');
        } finally {
            setIsCreatingTeam(false);
            setNewTeamName('');
        }
    };
    
    const handleRemoveMember = async () => {
        if (!memberToRemove) return;
        setIsRemoving(true);
        try {
            await updateProfileTeamId(memberToRemove, null);
            fetchTeamData();
        } catch (err) {
             console.error(err);
        } finally {
            setIsRemoving(false);
            setMemberToRemove(null);
        }
    };
    
    const handleLeaveTeam = async () => {
        if (!profile) return;
        setIsLeaving(true);
        try {
            await updateProfile({ team_id: null });
        } catch (err) {
            console.error(err);
        } finally {
            setIsLeaving(false);
            setShowLeaveModal(false);
        }
    };
    
    const handleInvite = async (email: string) => {
        if (!team) return;
        setIsInviting(true);
        try {
            const result = await inviteUserToTeam(email, team.id);
            if (result.success) {
                alert(result.message);
                fetchTeamData(); // Refresh team data to show new member
                setShowInviteModal(false);
            } else {
                throw new Error(result.message);
            }
        } catch (err) {
            console.error(err);
            alert(`Falha ao convidar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        } finally {
            setIsInviting(false);
        }
    };

    if (isLoading) {
        return <div className="flex-grow flex items-center justify-center"><Loader className="w-8 h-8 text-[#24a9c5]" /></div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-600">{error}</div>;
    }

    return (
        <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
            {team ? (
                <div>
                    <div className="md:flex md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">{team.name}</h1>
                        </div>
                        <div className="mt-4 flex md:mt-0 md:ml-4">
                            {isOwner ? (
                                <button onClick={() => setShowInviteModal(true)} className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#24a9c5] hover:bg-[#1e8a9f]">
                                    Convidar Membro
                                </button>
                            ) : (
                                 <button onClick={() => setShowLeaveModal(true)} className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
                                    Sair da Equipa
                                 </button>
                            )}
                        </div>
                    </div>

                    <div className="mt-8">
                         <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Membros ({team.members.length})</h2>
                         <ul className="bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                             {team.members.map(member => (
                                 <li key={member.id} className="flex items-center justify-between p-4">
                                     <div className="flex items-center gap-4">
                                         <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                            {member.photo_url ? <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-gray-500 dark:text-gray-300" />}
                                         </div>
                                         <div>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{member.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{member.id === team.owner_id ? 'Proprietário' : 'Membro'}</p>
                                         </div>
                                     </div>
                                     {isOwner && member.id !== profile?.id && (
                                         <button onClick={() => setMemberToRemove(member.id)} className="p-2 text-gray-500 hover:text-red-600">
                                             <TrashIcon className="w-5 h-5" />
                                         </button>
                                     )}
                                 </li>
                             ))}
                         </ul>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16">
                    <UsersIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto" />
                    <h1 className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-200">Ainda não faz parte de uma equipa</h1>
                    <p className="mt-2 max-w-prose mx-auto text-gray-600 dark:text-gray-400">
                        Crie uma equipa para partilhar transcrições e colaborar com colegas.
                    </p>
                    <form onSubmit={handleCreateTeam} className="mt-6 max-w-sm mx-auto flex items-center gap-3">
                        <input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="Nome da sua equipa"
                            required
                            className="flex-grow px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                        />
                        <button type="submit" disabled={isCreatingTeam} className="px-4 py-2 text-sm font-medium text-white bg-[#24a9c5] rounded-md hover:bg-[#1e8a9f] disabled:opacity-50">
                            {isCreatingTeam ? <Loader className="w-5 h-5"/> : 'Criar Equipa'}
                        </button>
                    </form>
                </div>
            )}
            
            <InviteMemberModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} onInvite={handleInvite} isInviting={isInviting} />
            
            <ConfirmationModal 
                isOpen={!!memberToRemove}
                onClose={() => setMemberToRemove(null)}
                onConfirm={handleRemoveMember}
                title="Remover Membro"
                message="Tem a certeza que deseja remover este membro da equipa? Ele perderá o acesso a todos os ficheiros partilhados."
                isConfirming={isRemoving}
            />
            
            <ConfirmationModal 
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                onConfirm={handleLeaveTeam}
                title="Sair da Equipa"
                message="Tem a certeza que deseja sair desta equipa? Perderá o acesso a todos os ficheiros partilhados."
                isConfirming={isLeaving}
                confirmButtonText="Sair"
            />
        </main>
    );
}
