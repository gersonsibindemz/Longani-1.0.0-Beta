import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    getAllTranscriptions, Transcription, getAudioFile, 
    addTeam, getTeam, updateTeam, deleteTeam, Team
} from '../utils/db';
import { Loader } from './Loader';
import { ChevronDownIcon, UsersIcon, UserIcon, TrashIcon, CloseIcon, ClipboardIcon, CheckIcon } from './Icons';
import { CustomAudioPlayer } from './CustomAudioPlayer';
// FIX: Changed the import source for the User type to the correct central definition in utils/db.
import type { User } from '../utils/db';
import { ConfirmationModal } from './ConfirmationModal';
import { InviteMemberModal } from './InviteMemberModal';
import type { RefineContentType, RefineOutputFormat } from '../services/geminiService';

const contentLabels: { [key in RefineContentType]: string } = {
    'meeting': 'Reunião',
    'sermon': 'Sermão',
    'interview': 'Entrevista',
    'lecture': 'Palestra',
    'note': 'Nota Pessoal',
};

const formatLabels: { [key in RefineOutputFormat]: string } = {
    'meeting-report': 'Relatório de Reunião',
    'report': 'Relatório Detalhado',
    'article': 'Artigo Envolvente',
    'key-points': 'Resumo de Pontos-Chave',
    'action-items': 'Lista de Ações',
};

const getRefinedTitle = (contentType?: string, outputFormat?: string): string => {
    if (!contentType || !outputFormat) {
        return 'Documento Refinado';
    }
    const contentLabel = contentLabels[contentType as RefineContentType] || 'Conteúdo';
    const formatLabel = formatLabels[outputFormat as RefineOutputFormat] || 'Documento';

    return `${formatLabel} (${contentLabel})`;
};


const SharedTranscriptionItem: React.FC<{ transcript: Transcription }> = ({ transcript }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    
    const [copiedRaw, setCopiedRaw] = useState(false);
    const [copiedCleaned, setCopiedCleaned] = useState(false);
    const [copiedRefined, setCopiedRefined] = useState(false);
    const cleanedContentRef = useRef<HTMLDivElement>(null);
    const refinedContentRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const loadAudio = async () => {
            if (isExpanded && transcript.audioId && !audioUrl) {
                setIsLoadingAudio(true);
                const audioFile = await getAudioFile(transcript.audioId);
                if (audioFile) {
                    setAudioUrl(URL.createObjectURL(audioFile.audioBlob));
                }
                setIsLoadingAudio(false);
            }
        };
        loadAudio();
        
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        }
    }, [isExpanded, transcript.audioId, audioUrl]);
    
    const handleCopyToClipboard = (type: 'raw' | 'cleaned' | 'refined') => {
        let textToCopy = '';
        let ref = null;
        let setCopied = (val: boolean) => {};

        switch (type) {
            case 'raw':
                textToCopy = transcript.rawTranscript;
                setCopied = setCopiedRaw;
                break;
            case 'cleaned':
                ref = cleanedContentRef;
                setCopied = setCopiedCleaned;
                break;
            case 'refined':
                ref = refinedContentRef;
                setCopied = setCopiedRefined;
                break;
        }

        if (ref?.current) {
            textToCopy = ref.current.innerText;
        }

        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => setCopied(true));
        }
    };
    
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (copiedRaw) timer = setTimeout(() => setCopiedRaw(false), 2000);
        if (copiedCleaned) timer = setTimeout(() => setCopiedCleaned(false), 2000);
        if (copiedRefined) timer = setTimeout(() => setCopiedRefined(false), 2000);
        return () => clearTimeout(timer);
    }, [copiedRaw, copiedCleaned, copiedRefined]);

    return (
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <header
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between p-4 cursor-pointer"
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
            >
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={transcript.filename}>{transcript.filename}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(transcript.date).toLocaleString('pt-PT', { dateStyle: 'long', timeStyle: 'short' })}
                    </p>
                     {transcript.sharedBy && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <UserIcon className="w-3 h-3"/>
                            <span>Partilhado por: {transcript.sharedBy}</span>
                        </div>
                    )}
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${ isExpanded ? 'rotate-180' : '' }`} />
            </header>
            <div className={`transition-[max-height] duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[300vh]' : 'max-h-0'}`}>
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-6">
                    {isLoadingAudio && <div className="py-4 text-center"><Loader className="w-6 h-6 text-[#24a9c5]" /></div>}
                    {audioUrl && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Áudio Original</p>
                            <CustomAudioPlayer src={audioUrl} />
                        </div>
                    )}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Texto Literal</h3>
                            <button onClick={() => handleCopyToClipboard('raw')} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><span className="sr-only">Copiar texto literal</span>{copiedRaw ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border"><p className="whitespace-pre-wrap font-mono text-sm text-gray-600 dark:text-gray-400">{transcript.rawTranscript}</p></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300">Texto Formatado</h3>
                            <button onClick={() => handleCopyToClipboard('cleaned')} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><span className="sr-only">Copiar texto formatado</span>{copiedCleaned ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}</button>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border">
                           <div ref={cleanedContentRef} className="prose dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-300" dangerouslySetInnerHTML={{ __html: transcript.cleanedTranscript }}/>
                        </div>
                    </div>
                     {transcript.refinedTranscript && (
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-gray-700 dark:text-gray-300">{getRefinedTitle(transcript.refinedContentType, transcript.refinedOutputFormat)}</h3>
                                <button onClick={() => handleCopyToClipboard('refined')} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><span className="sr-only">Copiar documento refinado</span>{copiedRefined ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}</button>
                            </div>
                            <div className="max-h-80 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border">
                            <div ref={refinedContentRef} className="prose dark:prose-invert max-w-none prose-p:text-gray-600 dark:prose-p:text-gray-300" dangerouslySetInnerHTML={{ __html: transcript.refinedTranscript }}/>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface TeamsPageProps {
    currentUser: User | null;
    onUserUpdate: (user: User) => void;
}

export const TeamsPage: React.FC<TeamsPageProps> = ({ currentUser, onUserUpdate }) => {
    const [team, setTeam] = useState<Team | null>(null);
    const [sharedTranscripts, setSharedTranscripts] = useState<Transcription[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    
    useEffect(() => {
        const loadTeamData = async () => {
            if (!currentUser) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            
            try {
                if (currentUser.teamId) {
                    const teamData = await getTeam(currentUser.teamId);
                    if (teamData) {
                        setTeam(teamData);
                        const allTranscriptions = await getAllTranscriptions();
                        setSharedTranscripts(allTranscriptions.filter(t => t.teamId === teamData.id));
                    } else {
                        // Team ID exists on user but not in DB, indicates an issue. Reset for user.
                        onUserUpdate({ ...currentUser, teamId: undefined });
                    }
                } else {
                    setTeam(null);
                }
            } catch (e) {
                setError("Não foi possível carregar os dados da equipa.");
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        loadTeamData();
    }, [currentUser, onUserUpdate]);

    const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const targetUrl = new URL(event.currentTarget.href, window.location.origin);
        window.location.hash = targetUrl.hash;
    };
    
    const handleCreateTeam = async (name: string) => {
        if (!currentUser) return;
        const newTeam: Team = {
            id: `team-${Date.now()}`,
            name,
            ownerId: currentUser.id,
            members: [{...currentUser, status: 'active' }],
        };
        await addTeam(newTeam);
        onUserUpdate({ ...currentUser, teamId: newTeam.id });
    };

    const handleInviteMember = async (email: string) => {
        if (!team) return;

        const normalizedEmail = email.toLowerCase().trim();

        if (team.members.find(m => m.id.toLowerCase() === normalizedEmail)) {
            alert("Este utilizador já faz parte da equipa.");
            return;
        }

        setIsInviting(true);
        try {
            // Create a new user with 'pending' status. The name is the email for now.
            const newMember: User = { id: normalizedEmail, name: normalizedEmail, photo: null, teamId: team.id, status: 'pending' };
            const updatedMembers = [...team.members, newMember];
            await updateTeam(team.id, { members: updatedMembers });
            setTeam({ ...team, members: updatedMembers });
            setIsInviteModalOpen(false);
        } catch (e) {
            console.error("Failed to invite member:", e);
            setError("Não foi possível convidar o membro. Por favor, tente novamente.");
        } finally {
            setIsInviting(false);
        }
    };
    
    const handleRemoveMember = async (memberId: string) => {
        if (!team || memberId === team.ownerId) return;
        const updatedMembers = team.members.filter(m => m.id !== memberId);
        await updateTeam(team.id, { members: updatedMembers });
        setTeam({ ...team, members: updatedMembers });
    };

    const handleAcceptInvite = async (memberId: string) => {
        if (!team) return;
        const newName = prompt("Para simular a aceitação do convite, por favor introduza o nome do novo membro:");
        if (newName && newName.trim()) {
            const updatedMembers = team.members.map(m => 
                m.id === memberId ? { ...m, name: newName.trim(), status: 'active' as const } : m
            );
            await updateTeam(team.id, { members: updatedMembers });
            setTeam({ ...team, members: updatedMembers });
        }
    };

    const handleDeleteTeam = async () => {
        if (!team || !currentUser) return;
        setIsDeleting(true);
        await deleteTeam(team.id);
        onUserUpdate({ ...currentUser, teamId: undefined });
        setIsDeleting(false);
        setShowDeleteConfirm(false);
    };

    if (isLoading) {
        return <div className="flex justify-center py-20"><Loader className="w-12 h-12 text-[#24a9c5]" /></div>;
    }

    if (!currentUser) {
        return (
            <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
                <div className="text-center py-16 animate-fade-in-up">
                    <UsersIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto" />
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">Acesso Restrito</h1>
                    <p className="mt-2 max-w-prose mx-auto text-gray-600 dark:text-gray-400">
                        É necessário iniciar sessão para aceder à funcionalidade de equipas. Por favor, <a href="#/login" onClick={handleNavClick} className="font-medium text-[#24a9c5] hover:underline">entre na sua conta</a> ou <a href="#/signup" onClick={handleNavClick} className="font-medium text-[#24a9c5] hover:underline">crie uma nova</a>.
                    </p>
                </div>
            </main>
        );
    }
    
    return (
        <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
            {team ? (
                // Team Dashboard View
                <div className="space-y-8 animate-fade-in">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{team.name}</h1>
                    
                    {/* Members Section */}
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Membros ({team.members.length})</h2>
                            {currentUser.id === team.ownerId && (
                                <button onClick={() => setIsInviteModalOpen(true)} className="text-sm font-medium text-white bg-[#24a9c5] hover:bg-[#1e8a9f] px-3 py-1.5 rounded-md">Convidar Membro</button>
                            )}
                        </div>
                        <ul className="space-y-3">
                            {team.members.map(member => {
                                const isPending = member.status === 'pending';
                                const isOwner = member.id === team.ownerId;
                                return (
                                    <li key={member.id} className={`flex items-center justify-between transition-opacity ${isPending ? 'opacity-60' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                                {member.photo ? <img src={member.photo} alt={member.name} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />}
                                            </div>
                                            <div>
                                                <p className="font-medium">{isPending ? member.id : member.name}</p>
                                                <p className="text-xs text-gray-500">{isOwner ? 'Proprietário' : (isPending ? 'Pendente' : 'Membro')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {currentUser.id === team.ownerId && isPending && (
                                                <button onClick={() => handleAcceptInvite(member.id)} className="text-xs font-semibold text-green-600 hover:underline px-2 py-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50">
                                                    Simular Aceitação
                                                </button>
                                            )}
                                            {currentUser.id === team.ownerId && member.id !== team.ownerId && (
                                                <button onClick={() => handleRemoveMember(member.id)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" aria-label={`Remover ${member.name}`}>
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>

                    {/* Shared Transcriptions Section */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Transcrições Partilhadas</h2>
                        {sharedTranscripts.length > 0 ? (
                            <div className="space-y-3">
                                {sharedTranscripts.map(t => <SharedTranscriptionItem key={t.id} transcript={t} />)}
                            </div>
                        ) : (
                            <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                <p className="text-gray-500">Nenhuma transcrição foi partilhada com esta equipa ainda.</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Admin Actions */}
                    {currentUser.id === team.ownerId && (
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                             <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Zona de Perigo</h3>
                             <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-medium">Apagar esta equipa</p>
                                    <p className="text-sm text-red-800 dark:text-red-300">Esta ação não pode ser desfeita. Todos os membros perderão o acesso.</p>
                                </div>
                                <button onClick={() => setShowDeleteConfirm(true)} className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md">Apagar</button>
                             </div>
                        </div>
                    )}

                </div>
            ) : (
                // Create Team View
                <div className="text-center py-16 animate-fade-in-up">
                    <UsersIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto" />
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">Trabalhe em equipa</h1>
                    <p className="mt-2 max-w-prose mx-auto text-gray-600 dark:text-gray-400">Crie uma equipa para partilhar e colaborar em transcrições com os seus colegas. Comece por dar um nome à sua equipa.</p>
                    <CreateTeamForm onCreateTeam={handleCreateTeam} />
                </div>
            )}
            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteTeam}
                isConfirming={isDeleting}
                title="Apagar Equipa"
                message="Tem a certeza de que deseja apagar permanentemente esta equipa? Esta ação não pode ser desfeita."
            />
            <InviteMemberModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onInvite={handleInviteMember}
                isInviting={isInviting}
            />
        </main>
    );
};

const CreateTeamForm: React.FC<{ onCreateTeam: (name: string) => void }> = ({ onCreateTeam }) => {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsLoading(true);
        // Simulate network delay
        setTimeout(() => {
            onCreateTeam(name.trim());
            // No need to setIsLoading(false) as the parent component will re-render
        }, 500);
    };

    return (
        <form onSubmit={handleSubmit} className="mt-8 max-w-sm mx-auto flex items-center gap-2">
            <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome da sua equipa..."
                required
                className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#24a9c5] dark:bg-gray-900 dark:text-gray-200 dark:border-gray-600"
            />
            <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-[#24a9c5] text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-[#1e8a9f] disabled:bg-gray-400"
            >
                {isLoading ? <Loader className="w-5 h-5" /> : 'Criar'}
            </button>
        </form>
    );
}