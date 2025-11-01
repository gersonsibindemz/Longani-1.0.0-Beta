import React, { useState } from 'react';
import type { Plan } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Loader } from './Loader';
import { CheckIcon, UsersIcon, SparkleIcon } from './Icons';

const plans = [
    {
        name: 'Básico',
        id: 'basico' as Plan,
        priceMonthly: 199,
        description: 'Ideal para utilizadores ocasionais que precisam de transcrições rápidas e precisas.',
        features: [
            '3 horas de transcrição de áudio por mês',
            'Transcrição e formatação com IA',
            'Suporte para múltiplos idiomas',
        ],
        icon: <CheckIcon className="w-5 h-5" />,
    },
    {
        name: 'Ideal',
        id: 'ideal' as Plan,
        priceMonthly: 499,
        description: 'Perfeito para profissionais e pequenas equipas que colaboram em projetos.',
        features: [
            '10 horas de transcrição de áudio por mês',
            'Todas as funcionalidades do plano Básico',
            'Colaboração em equipa (partilha de ficheiros)',
        ],
        icon: <UsersIcon className="w-5 h-5" />,
    },
    {
        name: 'Premium',
        id: 'premium' as Plan,
        priceMonthly: 999,
        description: 'A solução completa para utilizadores avançados e empresas com grandes volumes de áudio.',
        features: [
            'Horas de transcrição ilimitadas',
            'Todas as funcionalidades do plano Ideal',
            'Refinamento Avançado de Documentos',
            'Suporte prioritário',
        ],
        icon: <SparkleIcon className="w-5 h-5" />,
    }
];

export const PlansPage: React.FC = () => {
    const { profile, updateProfile, loading } = useAuth();
    const [isUpdating, setIsUpdating] = useState<Plan | null>(null);
    
    if (loading || !profile) {
        return <div className="flex-grow flex items-center justify-center"><Loader className="w-8 h-8 text-[#24a9c5]" /></div>;
    }

    const handleUpgrade = async (planId: Plan) => {
        setIsUpdating(planId);
        try {
            await updateProfile({ plan: planId });
            // The profile in context will update automatically, causing a re-render.
        } catch (error) {
            console.error("Failed to update plan", error);
            alert("Não foi possível atualizar o seu plano. Tente novamente.");
        } finally {
            setIsUpdating(null);
        }
    };

    return (
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
            <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-200">Planos e Preços</h1>
                <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
                    Escolha o plano que melhor se adapta às suas necessidades de transcrição.
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {plans.map((plan) => {
                    const finalPrice = plan.priceMonthly;

                    return (
                        <div key={plan.id} className={`rounded-2xl p-8 border-2 flex flex-col ${profile.plan === plan.id ? 'border-[#24a9c5] shadow-2xl bg-white/80 dark:bg-gray-800/80' : 'border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60'}`}>
                            <div className="flex-grow">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{plan.name}</h2>
                                
                                <p className="mt-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    {`${finalPrice.toLocaleString('pt-PT')} MZN`}
                                    <span className="text-base font-medium text-gray-500 dark:text-gray-400">
                                        /mês
                                    </span>
                                </p>
                               
                                <p className="mt-6 text-gray-600 dark:text-gray-400">{plan.description}</p>
                                <ul role="list" className="mt-8 space-y-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    {plan.features.map(feature => (
                                        <li key={feature} className="flex gap-x-3">
                                            <CheckIcon className="h-6 w-5 flex-none text-cyan-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="mt-8">
                                {profile.plan === plan.id ? (
                                    <button disabled className="w-full px-4 py-2 rounded-md bg-cyan-600 text-white font-semibold cursor-default">
                                        Plano Atual
                                    </button>
                                ) : (
                                    <button onClick={() => handleUpgrade(plan.id)} disabled={!!isUpdating} className="w-full flex items-center justify-center px-4 py-2 rounded-md bg-[#24a9c5] text-white font-semibold hover:bg-[#1e8a9f] transition-colors disabled:bg-gray-400">
                                        {isUpdating === plan.id ? <Loader className="w-5 h-5"/> : 'Fazer Upgrade'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </main>
    );
};