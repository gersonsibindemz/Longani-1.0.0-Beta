import React from 'react';
import { Loader } from './Loader';
import { CheckIcon } from './Icons';
import { longaniLogoUrl } from './Header';

interface ProcessingLogOverlayProps {
  steps: string[];
  currentStep: number;
}

export const ProcessingLogOverlay: React.FC<ProcessingLogOverlayProps> = ({ steps, currentStep }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
        <img src={longaniLogoUrl} alt="Longani Logo" className="h-20 mx-auto mb-6 pointer-events-none" />
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">A preparar a sua transcrição...</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Por favor, aguarde um momento. Estamos a tratar de tudo.</p>
        
        <ul className="space-y-4 text-left">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isPending = index > currentStep;

            return (
              <li key={index} className="flex items-center gap-4 transition-opacity duration-300" style={{ opacity: isPending ? 0.5 : 1 }}>
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  {isCompleted ? (
                    <CheckIcon className="w-6 h-6 text-green-500" />
                  ) : isCurrent ? (
                    <Loader className="w-5 h-5 text-cyan-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                  )}
                </div>
                <span className={`font-medium ${isPending ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                  {step}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
