import React, { useState } from 'react';
import { Loader } from './Loader';
import { CloseIcon, SparkleIcon } from './Icons';
import type { RefineContentType, RefineOutputFormat } from '../services/geminiService';

interface RefineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contentType: RefineContentType, outputFormat: RefineOutputFormat) => void;
  isRefining: boolean;
}

const contentTypes: { id: RefineContentType; label: string }[] = [
  { id: 'meeting', label: 'Reunião / Discussão' },
  { id: 'sermon', label: 'Sermão / Discurso' },
  { id: 'interview', label: 'Entrevista' },
  { id: 'lecture', label: 'Palestra / Apresentação' },
  { id: 'note', label: 'Nota Pessoal' },
];

const outputFormats: { id: RefineOutputFormat; label: string; description: string }[] = [
  { id: 'report', label: 'Relatório Detalhado', description: 'Ideal para reuniões. Inclui participantes, sumário e ações a tomar.' },
  { id: 'article', label: 'Artigo Envolvente', description: 'Formata o texto como um artigo de blog ou notícia, com títulos e ênfase.' },
  { id: 'key-points', label: 'Resumo de Pontos-Chave', description: 'Extrai as ideias principais numa lista concisa de marcadores.' },
  { id: 'action-items', label: 'Lista de Ações', description: 'Extrai apenas tarefas, decisões e itens de ação.' },
];

export const RefineModal: React.FC<RefineModalProps> = ({ isOpen, onClose, onSubmit, isRefining }) => {
  const [contentType, setContentType] = useState<RefineContentType>('meeting');
  const [outputFormat, setOutputFormat] = useState<RefineOutputFormat>('report');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(contentType, outputFormat);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refine-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 md:p-8 transform transition-all animate-zoom-in">
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          disabled={isRefining}
        >
          <CloseIcon className="w-6 h-6" />
        </button>

        <form onSubmit={handleSubmit}>
          <h2 id="refine-modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Refinamento Avançado</h2>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="content-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">O que é este áudio?</label>
              <select
                id="content-type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as RefineContentType)}
                className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#24a9c5] focus:border-[#24a9c5] transition"
              >
                {contentTypes.map(ct => <option key={ct.id} value={ct.id}>{ct.label}</option>)}
              </select>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Como deve ser o resultado?</p>
              <div className="space-y-2">
                {outputFormats.map(of => (
                  <label key={of.id} className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors ${outputFormat === of.id ? 'border-[#24a9c5] bg-cyan-50/50 dark:bg-cyan-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}>
                    <input
                      type="radio"
                      name="output-format"
                      value={of.id}
                      checked={outputFormat === of.id}
                      onChange={() => setOutputFormat(of.id as RefineOutputFormat)}
                      className="mt-1 h-4 w-4 text-[#24a9c5] border-gray-300 focus:ring-[#1e8a9f]"
                    />
                    <div className="ml-3 text-sm">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{of.label}</p>
                      <p className="text-gray-500 dark:text-gray-400">{of.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={isRefining}
              className="w-full flex items-center justify-center gap-2 bg-[#24a9c5] text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-[#1e8a9f] disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
            >
              {isRefining ? (
                <>
                  <Loader className="w-5 h-5" />
                  <span>A Refinar...</span>
                </>
              ) : (
                <>
                  <SparkleIcon className="w-5 h-5" />
                  <span>Iniciar Refinamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};