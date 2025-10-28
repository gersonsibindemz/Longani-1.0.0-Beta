import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    getAllTranscriptions, deleteTranscription, updateTranscription, Transcription, getAudioFile, AudioRecording,
    getAllFolders, addFolder, updateFolder, deleteFolder, Folder, updateAudioFile
} from '../utils/db';
import { Loader } from './Loader';
import { ClipboardIcon, CheckIcon, TrashIcon, ChevronDownIcon, SearchIcon, StarIcon, StarOutlineIcon, MoreVerticalIcon, EditIcon, InfoIcon, CloseIcon, SparkleIcon, UsersIcon } from './Icons';
import { ConfirmationModal } from './ConfirmationModal';
import { DropdownMenu } from './DropdownMenu';
import { PropertiesModal } from './PropertiesModal';
import { CustomAudioPlayer } from './CustomAudioPlayer';
import type { RefineContentType, RefineOutputFormat } from '../services/geminiService';
// FIX: Changed the import source for the User type to the correct central definition in utils/db.
import type { User } from '../utils/db';

const FOLDER_ID_UNFILED = 'unfiled';

const contentLabels: { [key in RefineContentType]?: string } = {
    'meeting': 'Reunião',
    'sermon': 'Sermão',
    'interview': 'Entrevista',
    'lecture': 'Palestra',
    'note': 'Nota Pessoal',
};

const formatLabels: { [key in RefineOutputFormat]?: string } = {
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

// Sub-component for tag editing
const TagEditor: React.FC<{ tags: string[]; onUpdate: (tags: string[]) => void }> = ({ tags, onUpdate }) => {
    const [inputValue, setInputValue] = useState('');
    const allTags = tags || [];

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = inputValue.trim().toLowerCase();
            if (newTag && !allTags.includes(newTag)) {
                onUpdate([...allTags, newTag]);
            }
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        onUpdate(allTags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-2">
                {allTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-300 text-xs font-medium px-2.5 py-1 rounded-full">
                        #{tag}
                        <button onClick={() => removeTag(tag)} className="ml-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200">
                            <CloseIcon className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Adicionar uma tag..."
                className="w-full text-sm bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-[#24a9c5] focus:outline-none"
            />
        </div>
    );
};

const TranscriptionItem: React.FC<{
  transcript: Transcription;
  folders: Folder[];
  onToggle: () => void;
  isExpanded: boolean;
  onDelete: () => void;
  onSetFavorite: (isFavorite: boolean) => void;
  onRename: (newName: string) => void;
  onShowProperties: () => void;
  onUpdateTags: (tags: string[]) => void;
  onMoveToFolder: (folderId: string | null) => void;
  onShareChange: () => void;
  isHighlighted: boolean;
  currentUser: User | null;
}> = ({ transcript, folders, onToggle, isExpanded, onDelete, onSetFavorite, onRename, onShowProperties, onUpdateTags, onMoveToFolder, onShareChange, isHighlighted, currentUser }) => {
    const [copiedRaw, setCopiedRaw] = useState(false);
    const [copiedCleaned, setCopiedCleaned] = useState(false);
    const [copiedRefined, setCopiedRefined] = useState(false);
    const cleanedContentRef = useRef<HTMLDivElement>(null);
    const refinedContentRef = useRef<HTMLDivElement>(null);
    const [audio, setAudio] = useState<AudioRecording | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(transcript.filename);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isRenaming) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isRenaming]);

    useEffect(() => {
        const loadAudio = async () => {
            if (isExpanded && transcript.audioId && !audio) {
                setIsLoadingAudio(true);
                const audioFile = await getAudioFile(transcript.audioId);
                if (audioFile) {
                    setAudio(audioFile);
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
    }, [isExpanded, transcript.audioId, audio, audioUrl]);

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


    const handleRenameConfirm = () => {
        if (newName.trim() && newName.trim() !== transcript.filename) {
            onRename(newName.trim());
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
    
    const handleRefineAndEdit = () => {
        sessionStorage.setItem('loadTranscriptionId', transcript.id);
        window.location.hash = '#/home';
    };

    const isShared = !!transcript.teamId;
    const canShare = !!currentUser?.teamId && currentUser.plan !== 'básico';

    const dropdownOptions = [
        { label: 'Refinar/Editar na Página Principal', icon: <SparkleIcon className="w-4 h-4" />, onClick: handleRefineAndEdit },
        { label: 'Renomear', icon: <EditIcon className="w-4 h-4" />, onClick: () => setIsRenaming(true) },
        { label: 'Propriedades', icon: <InfoIcon className="w-4 h-4" />, onClick: onShowProperties },
        { label: 'Mover para Pasta...', icon: <InfoIcon className="w-4 h-4" />,
          submenu: [
            { label: 'Sem Pasta', onClick: () => onMoveToFolder(null) },
            ...folders.map(f => ({ label: f.name, onClick: () => onMoveToFolder(f.id) }))
          ]
        },
        { label: isShared ? 'Deixar de Partilhar' : 'Partilhar com a Equipa', icon: <UsersIcon className="w-4 h-4" />, onClick: onShareChange, disabled: (isShared ? false : !canShare) },
        { label: transcript.isFavorite ? 'Remover Favorito' : 'Adicionar Favorito', icon: transcript.isFavorite ? <StarIcon className="w-4 h-4 text-yellow-500" /> : <StarOutlineIcon className="w-4 h-4" />, onClick: () => onSetFavorite(!transcript.isFavorite) },
        { label: 'Apagar', icon: <TrashIcon className="w-4 h-4" />, onClick: onDelete, className: 'text-red-600 dark:text-red-400' },
    ];

  return (
    <div 
      id={`transcription-item-${transcript.id}`}
      className={`bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300 ${isHighlighted ? 'animate-highlight-flash' : ''}`}
    >
      <header
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className="flex items-center justify-between p-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#24a9c5] rounded-t-lg"
      >
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
                <div className="flex items-center gap-2">
                    {/* FIX: Corrected the prop for the tooltip. The 'title' attribute is now correctly passed to the component. */}
                    {transcript.teamId && <UsersIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" title="Partilhado com a equipa"/>}
                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-2" title={transcript.filename}>
                        {transcript.filename}
                    </p>
                </div>
            )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(transcript.date).toLocaleString('pt-PT', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-4 flex-shrink-0">
          <DropdownMenu
            options={dropdownOptions}
            trigger={
                <span className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                    <MoreVerticalIcon className="w-5 h-5" />
                </span>
            }
          />
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${ isExpanded ? 'rotate-180' : '' }`}
          />
        </div>
      </header>
      <div className={`transition-[max-height] duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[300vh]' : 'max-h-0'}`}>
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-6">
            {isLoadingAudio && <div className="py-4 text-center"><Loader className="w-6 h-6 text-[#24a9c5]" /></div>}
            {audioUrl && audio && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Áudio Original</p>
                    <CustomAudioPlayer src={audioUrl} />
                </div>
            )}
          <div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</h3>
            <TagEditor tags={transcript.tags || []} onUpdate={onUpdateTags} />
          </div>
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
               <div ref={cleanedContentRef} className="prose prose-p:text-gray-600 prose-headings:text-gray-800 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-li:marker:text-[#24a9c5] prose-a:text-[#24a9c5] hover:prose-a:text-[#1e8a9f] dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: transcript.cleanedTranscript }}/>
            </div>
          </div>
          {transcript.refinedTranscript && (
             <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">{getRefinedTitle(transcript.refinedContentType, transcript.refinedOutputFormat)}</h3>
                    <button onClick={() => handleCopyToClipboard('refined')} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><span className="sr-only">Copiar documento refinado</span>{copiedRefined ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}</button>
                </div>
                <div className="max-h-80 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md border">
                   <div ref={refinedContentRef} className="prose prose-p:text-gray-600 prose-headings:text-gray-800 prose-strong:text-gray-900 prose-ul:text-gray-600 prose-li:marker:text-[#24a9c5] prose-a:text-[#24a9c5] hover:prose-a:text-[#1e8a9f] dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: transcript.refinedTranscript }}/>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface HistoryPageProps {
    currentUser: User | null;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ currentUser }) => {
  const [transcripts, setTranscripts] = useState<Transcription[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertiesItem, setPropertiesItem] = useState<Transcription | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Filtering state
  const [activeFilter, setActiveFilter] = useState<{ type: 'all' | 'folder' | 'tag' | 'unfiled', id?: string | null }>({ type: 'all' });
  
  // Modal states
  const [folderModal, setFolderModal] = useState<{ isOpen: boolean; folder?: Folder | null }>({ isOpen: false });
  const [deleteModal, setDeleteModal] = useState<{ type: 'transcription' | 'folder', id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [transcriptionData, folderData] = await Promise.all([getAllTranscriptions(), getAllFolders()]);
      setTranscripts(transcriptionData);
      setFolders(folderData);
    } catch (err) {
      setError('Não foi possível carregar os dados.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const idToHighlight = sessionStorage.getItem('highlightTranscriptionId');
    if (idToHighlight) {
        setHighlightedId(idToHighlight);
        setExpandedId(idToHighlight);
        sessionStorage.removeItem('highlightTranscriptionId'); // Clean up

        // Wait for render to complete before scrolling
        setTimeout(() => {
            const element = document.getElementById(`transcription-item-${idToHighlight}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
  }, []);

  // Derived state for tags
  const allTags = useMemo(() => {
      const tagSet = new Set<string>();
      transcripts.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
      return Array.from(tagSet).sort();
  }, [transcripts]);

  // Main filtering logic
  const filteredTranscripts = useMemo(() => {
    return transcripts.filter(t => {
      const searchMatch = searchQuery.trim() === '' ||
          t.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.rawTranscript.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.cleanedTranscript.toLowerCase().includes(searchQuery.toLowerCase());

      const filterMatch = () => {
          switch(activeFilter.type) {
              case 'folder': return t.folderId === activeFilter.id;
              case 'tag': return t.tags?.includes(activeFilter.id as string) ?? false;
              case 'unfiled': return !t.folderId;
              case 'all':
              default: return true;
          }
      }
      return searchMatch && filterMatch();
    });
  }, [transcripts, searchQuery, activeFilter]);

  // Handlers for transcriptions
  const handleUpdateTranscription = async (id: string, updates: Partial<Transcription>) => {
      const transcriptionToUpdate = transcripts.find(t => t.id === id);
      
      await updateTranscription(id, updates);
      
      // If tags are being updated, sync them with the associated audio file.
      if (updates.tags && transcriptionToUpdate?.audioId) {
          try {
              await updateAudioFile(transcriptionToUpdate.audioId, { tags: updates.tags });
          } catch (err) {
              console.error(`Failed to sync tags for audio file ${transcriptionToUpdate.audioId}:`, err);
              // Non-critical error, so we don't need to show a UI message.
          }
      }

      setTranscripts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  const handleDeleteTranscription = async () => {
      if (deleteModal?.type !== 'transcription') return;
      setIsDeleting(true);
      await deleteTranscription(deleteModal.id);
      setIsDeleting(false);
      setDeleteModal(null);
      loadData();
  };

  // Handlers for folders
  const handleSaveFolder = async (name: string) => {
      if (folderModal.folder) { // Editing existing
          await updateFolder(folderModal.folder.id, { name });
      } else { // Creating new
          const newFolder: Folder = { id: `folder-${Date.now()}`, name, date: Date.now() };
          await addFolder(newFolder);
      }
      setFolderModal({ isOpen: false });
      loadData();
  };
  const handleDeleteFolder = async () => {
      if (deleteModal?.type !== 'folder') return;
      setIsDeleting(true);
      await deleteFolder(deleteModal.id);
      setIsDeleting(false);
      setDeleteModal(null);
      if (activeFilter.type === 'folder' && activeFilter.id === deleteModal.id) {
        setActiveFilter({ type: 'all' });
      }
      loadData();
  };

  const getActiveFilterName = () => {
      switch(activeFilter.type) {
          case 'folder': return `Pasta: ${folders.find(f => f.id === activeFilter.id)?.name || '...'}`;
          case 'tag': return `Tag: #${activeFilter.id}`;
          case 'unfiled': return 'Transcrições Sem Pasta';
          case 'all': default: return 'Todas as Transcrições';
      }
  };

  return (
    <>
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6">Minhas Transcrições</h1>
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
            {/* Sidebar */}
            <aside className="md:w-64 flex-shrink-0 space-y-6">
                {/* Folders */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Pastas</h2>
                        <button onClick={() => setFolderModal({ isOpen: true })} className="text-sm text-[#24a9c5] hover:underline">Adicionar</button>
                    </div>
                    <ul className="space-y-1">
                        <li><button onClick={() => setActiveFilter({ type: 'all' })} className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${activeFilter.type === 'all' ? 'bg-cyan-100 dark:bg-cyan-900/50 font-semibold text-cyan-800 dark:text-cyan-200' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Todas as Transcrições</button></li>
                        <li><button onClick={() => setActiveFilter({ type: 'unfiled' })} className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${activeFilter.type === 'unfiled' ? 'bg-cyan-100 dark:bg-cyan-900/50 font-semibold text-cyan-800 dark:text-cyan-200' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Sem Pasta</button></li>
                        {folders.map(folder => (
                            <li key={folder.id} className="group flex justify-between items-center">
                                <button onClick={() => setActiveFilter({ type: 'folder', id: folder.id })} className={`w-full text-left px-3 py-1.5 rounded-md text-sm truncate transition-colors ${activeFilter.type === 'folder' && activeFilter.id === folder.id ? 'bg-cyan-100 dark:bg-cyan-900/50 font-semibold text-cyan-800 dark:text-cyan-200' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}>{folder.name}</button>
                                <DropdownMenu options={[{label: 'Renomear', icon: <EditIcon className="w-4 h-4"/>, onClick: () => setFolderModal({isOpen: true, folder})}, {label: 'Apagar', icon: <TrashIcon className="w-4 h-4"/>, onClick: () => setDeleteModal({type: 'folder', id: folder.id}), className: 'text-red-500'}]} trigger={<span className="p-1 opacity-0 group-hover:opacity-100"><MoreVerticalIcon className="w-4 h-4"/></span>}/>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Tags */}
                {allTags.length > 0 && <div>
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</h2>
                    <div className="flex flex-wrap gap-2">
                        {allTags.map(tag => (
                            <button key={tag} onClick={() => setActiveFilter({ type: 'tag', id: tag })} className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${activeFilter.type === 'tag' && activeFilter.id === tag ? 'bg-[#24a9c5] text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>#{tag}</button>
                        ))}
                    </div>
                </div>}
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 truncate">{getActiveFilterName()}</h2>
                    <div className="relative flex-shrink-0 w-full sm:w-64">
                        <input type="search" placeholder="Pesquisar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm text-gray-700 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#24a9c5] dark:bg-gray-800/80 dark:text-gray-200 dark:border-gray-600"/>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="w-5 h-5 text-gray-400" /></div>
                    </div>
                </div>

                {isLoading && <div className="flex justify-center py-10"><Loader className="w-10 h-10 text-[#24a9c5]" /></div>}
                {error && <div className="text-center text-red-800 bg-red-100 p-4 rounded-lg">{error}</div>}
                {!isLoading && !error && transcripts.length === 0 && (
                    <div className="text-center py-20"><p className="text-lg text-gray-600 dark:text-gray-400">Nenhuma transcrição encontrada.</p></div>
                )}
                {!isLoading && !error && transcripts.length > 0 && filteredTranscripts.length === 0 && (
                    <div className="text-center py-10"><p className="text-gray-600 dark:text-gray-400">Nenhum resultado encontrado.</p></div>
                )}
                {!isLoading && !error && filteredTranscripts.length > 0 && (
                    <div className="space-y-3">
                    {filteredTranscripts.map((t) => (
                        <TranscriptionItem
                            key={t.id}
                            transcript={t}
                            folders={folders}
                            currentUser={currentUser}
                            isExpanded={expandedId === t.id}
                            onToggle={() => setExpandedId(currentId => (currentId === t.id ? null : t.id))}
                            onDelete={() => setDeleteModal({type: 'transcription', id: t.id})}
                            onSetFavorite={(isFav) => handleUpdateTranscription(t.id, { isFavorite: isFav })}
                            onRename={(newName) => handleUpdateTranscription(t.id, { filename: newName })}
                            onShowProperties={() => setPropertiesItem(t)}
                            onUpdateTags={(tags) => handleUpdateTranscription(t.id, { tags })}
                            onMoveToFolder={(folderId) => handleUpdateTranscription(t.id, { folderId: folderId === null ? undefined : folderId })}
                            onShareChange={() => handleUpdateTranscription(t.id, { teamId: t.teamId ? undefined : currentUser?.teamId, sharedBy: t.teamId ? undefined : currentUser?.name })}
                            isHighlighted={highlightedId === t.id}
                        />
                    ))}
                    </div>
                )}
            </div>
        </div>
      </main>
      
      {/* Modals */}
      <ConfirmationModal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={deleteModal?.type === 'transcription' ? handleDeleteTranscription : handleDeleteFolder}
        isConfirming={isDeleting}
        title={`Apagar ${deleteModal?.type === 'folder' ? 'Pasta' : 'Transcrição'}`}
        message={`Tem a certeza? ${deleteModal?.type === 'folder' ? 'As transcrições nesta pasta não serão apagadas.' : 'Esta ação não pode ser desfeita.'}`}
      />
      {folderModal.isOpen && <FolderModal folder={folderModal.folder} onSave={handleSaveFolder} onClose={() => setFolderModal({isOpen: false})} />}
      <PropertiesModal item={propertiesItem} onClose={() => setPropertiesItem(null)} additionaData={{folderName: propertiesItem?.folderId ? folders.find(f => f.id === propertiesItem.folderId)?.name : null}} />
    </>
  );
};


// Simple modal for adding/editing a folder
const FolderModal: React.FC<{ folder?: Folder | null, onClose: () => void, onSave: (name: string) => void }> = ({ folder, onClose, onSave }) => {
    const [name, setName] = useState(folder?.name || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
        }
    };
    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 transform transition-all animate-zoom-in">
                <h3 className="text-lg font-semibold mb-4">{folder ? 'Renomear Pasta' : 'Nova Pasta'}</h3>
                <form onSubmit={handleSubmit}>
                    <input ref={inputRef} value={name} onChange={e => setName(e.target.value)} placeholder="Nome da pasta" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600">Cancelar</button>
                        <button type="submit" className="px-4 py-2 rounded-md bg-[#24a9c5] text-white">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};