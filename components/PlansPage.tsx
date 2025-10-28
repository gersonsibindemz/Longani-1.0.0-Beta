import React, { useState } from 'react';
import type { User, Plan } from '../utils/db';
import { CheckIcon, CloseIcon, InfoIcon } from './Icons';
import { Loader } from './Loader';
import { isTrialActive, getTrialDaysRemaining } from '../utils/audioUtils';

interface PlansPageProps {
    currentUser: User | null;
    onUserUpdate: (user: User) => void;
}

const planDetails = {
    básico: {
        name: 'Básico',
        price: '350',
        description: 'Ideal para utilizadores casuais e projetos pessoais.',
        features: [
            { text: 'Transcrição de áudio', included: true },
            { text: 'Até 3 horas/mês', included: true },
            { text: 'Suporte por email', included: true },
            { text: 'Partilha em equipa', included: false },
            { text: 'Refinamento avançado ilimitado', included: false },
        ],
        order: 1,
    },
    ideal: {
        name: 'Ideal',
        price: '500',
        description: 'Perfeito para profissionais e pequenas equipas.',
        features: [
            { text: 'Transcrição de áudio', included: true },
            { text: 'Até 10 horas/mês', included: true },
            { text: 'Suporte prioritário', included: true },
            { text: 'Partilha em equipa (até 5 membros)', included: true },
            { text: 'Refinamento avançado ilimitado', included: false },
        ],
        order: 2,
    },
    premium: {
        name: 'Premium',
        price: '1200',
        description: 'A solução completa para grandes equipas e empresas.',
        features: [
            { text: 'Transcrição de áudio', included: true },
            { text: 'Horas ilimitadas', included: true },
            { text: 'Suporte dedicado 24/7', included: true },
            { text: 'Partilha em equipa (membros ilimitados)', included: true },
            { text: 'Refinamento avançado ilimitado', included: true },
        ],
        order: 3,
    }
};

export const PlansPage: React.FC<PlansPageProps> = ({ currentUser, onUserUpdate }) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const handlePlanChange = (newPlan: Plan) => {
        if (!currentUser) return;
        setIsUpdating(true);
        // Simulate an API call
        setTimeout(() => {
            onUserUpdate({ ...currentUser, plan: newPlan });
            setIsUpdating(false);
        }, 1000);
    };

    const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        const targetUrl = new URL(event.currentTarget.href, window.location.origin);
        window.location.hash = targetUrl.hash;
    };
    
    if (!currentUser) {
        return (
            <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
                <div className="text-center py-16 animate-fade-in-up">
                    <h1 className="mt-4 text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200">Acesso Restrito</h1>
                    <p className="mt-2 max-w-prose mx-auto text-gray-600 dark:text-gray-400">
                        É necessário iniciar sessão para ver os planos. Por favor, <a href="#/login" onClick={handleNavClick} className="font-medium text-[#24a9c5] hover:underline">entre na sua conta</a> ou <a href="#/signup" onClick={handleNavClick} className="font-medium text-[#24a9c5] hover:underline">crie uma nova</a>.
                    </p>
                </div>
            </main>
        );
    }
    
    const currentPlan = currentUser.plan || 'trial';
    const isTrialPlan = currentPlan === 'trial';
    const trialIsActive = isTrialActive(currentUser.createdAt);
    const trialDaysRemaining = getTrialDaysRemaining(currentUser.createdAt);
    const currentPlanOrder = isTrialPlan ? 0 : planDetails[currentPlan as Exclude<Plan, 'trial'>].order;

    return (
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
            <div className="text-center animate-fade-in">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-200">
                    Planos e Preços
                </h1>
                <p className="mt-2 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
                    Escolha o plano que melhor se adapta às suas necessidades e comece a transcrever com mais eficiência.
                </p>
            </div>
            
            {isTrialPlan && (
                <div className={`mt-8 max-w-3xl mx-auto p-4 rounded-lg border text-center animate-fade-in ${
                    trialIsActive 
                        ? 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800/50' 
                        : 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800/60'
                }`}>
                    <p className={`font-semibold ${trialIsActive ? 'text-cyan-800 dark:text-cyan-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                        <InfoIcon className="w-5 h-5 inline-block mr-2 align-middle" />
                        {trialIsActive 
                            ? `Você está no plano Trial. Restam ${trialDaysRemaining} dia(s) com acesso às funcionalidades do plano Básico.`
                            : 'O seu período de teste terminou. Faça um upgrade para continuar a usar o Longani.'
                        }
                    </p>
                </div>
            )}

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.entries(planDetails).map(([planKey, details]) => {
                    const plan = planKey as Plan;
                    const isCurrentPlan = currentPlan === plan;
                    const isUpgrade = details.order > currentPlanOrder;
                    const isDowngrade = details.order < currentPlanOrder;
                    const isPopular = plan === 'ideal';

                    return (
                        <div key={plan} className={`relative flex flex-col p-8 rounded-2xl border-2 shadow-lg animate-fade-in-up transition-all duration-300
                            ${isCurrentPlan ? 'border-[#24a9c5] scale-105' : 'border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60'}`}
                            style={{ animationDelay: `${details.order * 100}ms` }}
                        >
                            {isPopular && !isCurrentPlan && (
                                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 px-3 py-1 text-sm font-semibold tracking-wide text-white bg-[#24a9c5] rounded-full shadow-md">
                                    Mais Popular
                                </div>
                            )}
                            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{details.name}</h3>
                            <p className="mt-4 text-gray-600 dark:text-gray-400 flex-grow">{details.description}</p>
                            <div className="mt-6">
                                <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">{details.price}</span>
                                <span className="text-base font-medium text-gray-500 dark:text-gray-400"> MZN/mês</span>
                            </div>
                            
                            <ul className="mt-8 space-y-4">
                                {details.features.map(feature => (
                                    <li key={feature.text} className="flex items-start">
                                        {feature.included ? (
                                            <CheckIcon className="flex-shrink-0 w-5 h-5 text-green-500 mt-0.5" />
                                        ) : (
                                            <CloseIcon className="flex-shrink-0 w-5 h-5 text-red-500 mt-0.5" />
                                        )}
                                        <span className={`ml-3 text-gray-700 dark:text-gray-300 ${!feature.included && 'line-through text-gray-400 dark:text-gray-500'}`}>
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-auto pt-8">
                                <button
                                    onClick={() => handlePlanChange(plan)}
                                    disabled={isCurrentPlan || isUpdating}
                                    className={`w-full flex justify-center items-center py-3 px-6 text-sm font-semibold rounded-lg shadow-md transition-all duration-300
                                        ${isCurrentPlan ? 'bg-gray-300 text-gray-500 cursor-default dark:bg-gray-600 dark:text-gray-400' 
                                            : isTrialPlan ? 'bg-[#24a9c5] text-white hover:bg-[#1e8a9f]'
                                            : isUpgrade ? 'bg-[#24a9c5] text-white hover:bg-[#1e8a9f]'
                                            : 'bg-white text-[#24a9c5] border-2 border-[#24a9c5] hover:bg-cyan-50 dark:bg-gray-700 dark:hover:bg-gray-600'
                                        }
                                        disabled:opacity-70 disabled:cursor-wait
                                    `}
                                >
                                    {isUpdating && <Loader className="w-5 h-5 mr-2" />}
                                    {isCurrentPlan ? 'Plano Atual' : (isTrialPlan ? 'Fazer Upgrade' : (isUpgrade ? 'Fazer Upgrade' : 'Fazer Downgrade'))}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </main>
    );
};
