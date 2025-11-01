import React, { useState, useEffect } from 'react';
import { MenuIcon, CloseIcon, UserIcon, SunIcon, MoonIcon, UsersIcon, SearchIcon, CreditCardIcon } from './Icons';
import type { Profile, Theme, PreferredLanguage } from '../types';
import { isTrialActive, getTrialDaysRemaining, getPlanLimits, TRIAL_PERIOD_DAYS } from '../utils/audioUtils';

// The logo is loaded from an external URL.
export const longaniLogoUrl = "https://i.postimg.cc/FsF4dhc0/Longani-Logo.png";

interface HeaderProps {
  page: string;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  preferredLanguage: PreferredLanguage;
  setPreferredLanguage: (lang: PreferredLanguage) => void;
  currentUser: Profile | null;
  onLogout: () => void;
  onSearchClick: () => void;
  onHomeReset: () => void;
  monthlyUsage: number;
}

export const Header: React.FC<HeaderProps> = (props) => {
  const { page, theme, setTheme, preferredLanguage, setPreferredLanguage, currentUser, onLogout, onSearchClick, onHomeReset, monthlyUsage } = props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [localTheme, setLocalTheme] = useState(theme);
  const [localLanguage, setLocalLanguage] = useState(preferredLanguage);

  useEffect(() => {
    setLocalTheme(theme);
  }, [theme]);
  
  useEffect(() => {
    setLocalLanguage(preferredLanguage);
  }, [preferredLanguage]);

  // Effect to lock body scroll when the mobile menu is open.
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    // Cleanup: ensure the class is removed when the component unmounts.
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isMenuOpen]);
  
  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const targetUrl = new URL(event.currentTarget.href);
    window.location.hash = targetUrl.hash;
    setIsMenuOpen(false); // Close menu on navigation
  };

  const handleHomeResetClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onHomeReset();
    window.location.hash = '#/home';
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  }

  const handleSavePreferences = () => {
    setTheme(localTheme);
    setPreferredLanguage(localLanguage);
    setIsMenuOpen(false); // Close menu
  };
  
  const handleLogoutAndCloseMenu = () => {
    onLogout();
    setIsMenuOpen(false);
  };

  const isTrialPlan = currentUser?.plan === 'trial';
  const trialIsActive = isTrialActive(currentUser?.created_at);
  const trialDaysRemaining = getTrialDaysRemaining(currentUser?.created_at);
  const trialProgressPercentage = isTrialPlan && trialIsActive ? (trialDaysRemaining / TRIAL_PERIOD_DAYS) * 100 : 0;

  const planLimits = getPlanLimits();
  const currentPlanLimit = currentUser ? planLimits[currentUser.plan || 'basico'] : 0;
  const usagePercentage = currentPlanLimit !== Infinity && currentPlanLimit > 0 ? (monthlyUsage / currentPlanLimit) * 100 : 0;
  const usageMinutes = Math.floor(monthlyUsage / 60);
  const limitHours = currentPlanLimit !== Infinity ? Math.round(currentPlanLimit / 3600) : 'Ilimitado';
  const limitInMinutes = typeof limitHours === 'number' ? limitHours * 60 : null;

  return (
    <>
      <header className="sticky top-0 z-30 py-2 bg-gray-100/75 dark:bg-gray-900/75 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Left side: Mobile Menu and Logo */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button (visible only on small screens) */}
            <div className="xl:hidden">
              <button
                onClick={toggleMenu}
                aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
                className="p-2 text-gray-700 dark:text-gray-300 hover:text-[#24a9c5] dark:hover:text-[#24a9c5] relative z-50"
              >
                {isMenuOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
              </button>
            </div>
            
            {/* Logo */}
            <div className="flex-shrink-0">
              <a
                href="#/home"
                onClick={handleHomeResetClick}
                aria-label="Página inicial do Longani"
                className="inline-block rounded-md transition-transform duration-150 ease-in-out active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#24a9c5] dark:focus-visible:ring-offset-gray-900"
              >
                <img
                  src={longaniLogoUrl}
                  alt="Longani Logo"
                  className="h-16 -my-2 pointer-events-none select-none"
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                />
              </a>
            </div>
          </div>
          
          {/* Right side: Desktop Menu and Search */}
          <div className="flex items-center gap-4">
            <nav className="hidden xl:block">
              <ul className="flex items-center gap-6">
                <li>
                  <a
                    href="#/home"
                    onClick={handleHomeResetClick}
                    className={`font-medium hover:text-[#24a9c5] transition-colors ${
                      page === 'home' ? 'text-[#24a9c5]' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Nova Transcrição
                  </a>
                </li>
                <li>
                  <a
                    href="#/recordings"
                    onClick={handleNavClick}
                    className={`font-medium hover:text-[#24a9c5] transition-colors ${
                      page === 'recordings' ? 'text-[#24a9c5]' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Gravações
                  </a>
                </li>
                <li>
                  <a
                    href="#/history"
                    onClick={handleNavClick}
                    className={`font-medium hover:text-[#24a9c5] transition-colors ${
                      page === 'history' ? 'text-[#24a9c5]' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Minhas Transcrições
                  </a>
                </li>
                {currentUser?.plan !== 'trial' && (
                  <li>
                    <a
                      href="#/favorites"
                      onClick={handleNavClick}
                      className={`font-medium hover:text-[#24a9c5] transition-colors ${
                        page === 'favorites' ? 'text-[#24a9c5]' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      Favoritos
                    </a>
                  </li>
                )}
                {currentUser?.plan !== 'trial' && (
                  <li>
                    <a
                      href="#/translations"
                      onClick={handleNavClick}
                      className={`font-medium hover:text-[#24a9c5] transition-colors ${
                        page === 'translations' ? 'text-[#24a9c5]' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      Traduções
                    </a>
                  </li>
                )}
                 <li>
                  <a
                    href="#/plans"
                    onClick={handleNavClick}
                    className={`font-medium hover:text-[#24a9c5] transition-colors ${
                      page === 'plans' ? 'text-[#24a9c5]' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    Planos
                  </a>
                </li>
                {(currentUser?.plan === 'ideal' || currentUser?.plan === 'premium') && (
                  <li>
                    <a
                      href="#/teams"
                      onClick={handleNavClick}
                      className={`font-medium hover:text-[#24a9c5] transition-colors ${
                        page === 'teams' ? 'text-[#24a9c5]' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      Equipa
                    </a>
                  </li>
                )}
                {currentUser ? (
                  <>
                    <li>
                      <a
                        href="#/profile"
                        onClick={handleNavClick}
                        className={`font-medium hover:text-[#24a9c5] transition-colors ${
                          page === 'profile' ? 'text-[#24a9c5]' : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        Meu Perfil
                      </a>
                    </li>
                    <li>
                      <button onClick={onLogout} className="font-medium text-gray-600 dark:text-gray-300 hover:text-[#24a9c5] transition-colors">
                        Sair
                      </button>
                    </li>
                  </>
                ) : (
                  <li>
                    <a href="#/login" onClick={handleNavClick} className={`font-medium hover:text-[#24a9c5] transition-colors ${
                        page === 'login' ? 'text-[#24a9c5]' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      Entrar / Cadastrar
                    </a>
                  </li>
                )}
              </ul>
            </nav>
            {/* Search Button */}
            <button
              onClick={onSearchClick}
              aria-label="Pesquisar"
              className="p-2 text-gray-700 dark:text-gray-300 hover:text-[#24a9c5] dark:hover:text-[#24a9c5] transition-colors rounded-full"
            >
              <SearchIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        role="presentation"
        onClick={() => setIsMenuOpen(false)}
        className={`xl:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Mobile Menu Sidebar */}
      <aside
        id="mobile-menu"
        className={`xl:hidden fixed top-0 left-0 h-full w-4/5 max-w-xs bg-white/75 dark:bg-gray-800/75 backdrop-blur-xl shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div className="p-4 flex flex-col h-full overflow-y-auto">
            {/* Sidebar Header - User Profile */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-200/60 dark:border-gray-700/60">
                <a href="#/profile" onClick={handleNavClick} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-transparent hover:ring-[#24a9c5] transition-shadow">
                    {currentUser?.photo_url ? (
                        <img src={currentUser.photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="w-6 h-6 text-gray-500 dark:text-gray-300" />
                    )}
                </a>
                <div>
                    {currentUser ? (
                      <>
                        <a href="#/profile" onClick={handleNavClick} className="font-semibold text-gray-800 dark:text-gray-200 hover:underline">{currentUser.name}</a>
                        <a
                            href="#/plans"
                            onClick={handleNavClick}
                            className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400 hover:text-[#24a9c5] dark:hover:text-[#24a9c5] transition-colors"
                        >
                            <CreditCardIcon className="w-4 h-4 mr-1.5" />
                            <span>Plano </span>
                            <span className="capitalize font-semibold ml-1">{currentUser.plan || 'basico'}</span>
                            {isTrialActive(currentUser.created_at) && (
                                <span className="ml-2 text-xs font-semibold bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full dark:bg-yellow-900 dark:text-yellow-200">
                                    Trial
                                </span>
                            )}
                        </a>
                      </>
                    ) : (
                      <a href="#/login" onClick={handleNavClick} className="font-semibold text-gray-800 dark:text-gray-200 hover:underline">
                        Entrar / Cadastrar
                      </a>
                    )}
                </div>
            </div>
            
             {/* Usage and Trial Status */}
            {currentUser && <div className="px-4 py-2 space-y-4 mb-2">
                {isTrialPlan && trialIsActive && (
                    <div>
                        <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>Teste Gratuito</span>
                            <span className="font-semibold">{trialDaysRemaining} dia(s) restante(s)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                            <div
                                className="bg-yellow-400 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${trialProgressPercentage}%` }}
                                role="progressbar"
                                aria-valuenow={trialDaysRemaining}
                                aria-valuemin={0}
                                aria-valuemax={TRIAL_PERIOD_DAYS}
                                aria-label={`${trialDaysRemaining} dias de teste restantes`}
                            ></div>
                        </div>
                    </div>
                )}
                {currentUser?.plan !== 'trial' && (
                    <div>
                        <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>Uso Mensal</span>
                            <span className="font-semibold">
                                {limitInMinutes === null
                                    ? `${usageMinutes} min. usados`
                                    : `${usageMinutes} / ${limitInMinutes} min`
                                }
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                            <div
                                className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${currentPlanLimit === Infinity ? 100 : Math.min(100, usagePercentage)}%` }}
                                role="progressbar"
                                aria-valuenow={usageMinutes}
                                aria-valuemin={0}
                                aria-valuemax={limitInMinutes === null ? usageMinutes : limitInMinutes}
                                aria-label={`Uso mensal: ${usageMinutes} de ${limitInMinutes === null ? 'ilimitados' : limitInMinutes} minutos`}
                            ></div>
                        </div>
                    </div>
                )}
            </div>}

            {/* Navigation */}
            <div className="flex-grow">
                <h3 className="px-4 text-base font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Painel
                </h3>
                <nav>
                    <ul className="flex flex-col gap-2">
                        <li>
                          <a
                              href="#/home"
                              onClick={handleHomeResetClick}
                              className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                page === 'home' ? 'text-[#24a9c5] bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'
                              }`}
                          >
                              Nova Transcrição
                          </a>
                        </li>
                        <li>
                          <a
                              href="#/recordings"
                              onClick={handleNavClick}
                              className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                page === 'recordings' ? 'text-[#24a9c5] bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'
                              }`}
                          >
                              Gravações
                          </a>
                        </li>
                        <li>
                          <a
                              href="#/history"
                              onClick={handleNavClick}
                              className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                page === 'history' ? 'text-[#24a9c5] bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'
                              }`}
                          >
                              Minhas Transcrições
                          </a>
                        </li>
                        {currentUser?.plan !== 'trial' && (
                          <li>
                            <a
                                href="#/favorites"
                                onClick={handleNavClick}
                                className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                  page === 'favorites' ? 'text-[#24a9c5] bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                Favoritos
                            </a>
                          </li>
                        )}
                         {currentUser?.plan !== 'trial' && (
                          <li>
                            <a
                                href="#/translations"
                                onClick={handleNavClick}
                                className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                  page === 'translations' ? 'text-[#24a9c5] bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                Traduções
                            </a>
                          </li>
                         )}
                         {(currentUser?.plan === 'ideal' || currentUser?.plan === 'premium') && (
                          <li>
                            <a
                                href="#/teams"
                                onClick={handleNavClick}
                                className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                  page === 'teams' ? 'text-[#24a9c5] bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                Equipa
                            </a>
                          </li>
                         )}
                         <li>
                          <a
                              href="#/profile"
                              onClick={handleNavClick}
                              className={`block px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                page === 'profile' ? 'text-[#24a9c5] bg-gray-100 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'
                              }`}
                          >
                              Meu Perfil
                          </a>
                        </li>
                    </ul>
                </nav>
            </div>

            {/* Logout Section */}
            {currentUser && (
                <div className="py-2">
                    <button
                        onClick={handleLogoutAndCloseMenu}
                        className="block w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-800/20 transition-colors"
                    >
                        Sair
                    </button>
                </div>
            )}

            {/* Preferences & Footer Section */}
            <div>
              <div className="pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
                <h3 className="px-4 text-base font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Preferências
                </h3>
                <div className="px-4 py-2 space-y-4">
                    {/* Theme Switcher */}
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tema</p>
                        <button
                            type="button"
                            role="switch"
                            aria-label={`Mudar para modo ${localTheme === 'dark' ? 'claro' : 'escuro'}`}
                            aria-checked={localTheme === 'light'}
                            onClick={() => setLocalTheme(localTheme === 'dark' ? 'light' : 'dark')}
                            className="relative w-12 h-7 flex items-center bg-gray-300 dark:bg-gray-600 rounded-full p-1 cursor-pointer transition-colors duration-300"
                        >
                            <span className="absolute left-0 w-full h-full flex items-center justify-between px-2">
                                <MoonIcon className={`w-3 h-3 transition-colors ${localTheme === 'dark' ? 'text-yellow-400' : 'text-gray-500'}`} />
                                <SunIcon className={`w-3 h-3 transition-colors ${localTheme === 'light' ? 'text-yellow-500' : 'text-gray-500'}`} />
                            </span>
                            <span
                                className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${localTheme === 'light' ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                    {/* Language Selector */}
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Idioma de Saída</p>
                        <div role="radiogroup" className="flex items-center gap-4">
                            <button role="radio" aria-checked={localLanguage === 'pt'} onClick={() => setLocalLanguage('pt')} className={`text-sm font-medium transition-colors ${localLanguage === 'pt' ? 'text-[#24a9c5] font-bold underline' : 'text-gray-600 dark:text-gray-300 hover:text-[#24a9c5] hover:underline'}`}>Português</button>
                            <button role="radio" aria-checked={localLanguage === 'en'} onClick={() => setLocalLanguage('en')} className={`text-sm font-medium transition-colors ${localLanguage === 'en' ? 'text-[#24a9c5] font-bold underline' : 'text-gray-600 dark:text-gray-300 hover:text-[#24a9c5] hover:underline'}`}>Inglês</button>
                        </div>
                    </div>
                     {/* Save Button */}
                    <div className="text-left mt-4">
                        <button onClick={handleSavePreferences} className="text-sm font-bold text-[#24a9c5] hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] dark:focus:ring-offset-gray-800 rounded-md p-1">
                            Guardar e Atualizar
                        </button>
                    </div>
                </div>
              </div>

              {/* Sidebar Footer */}
              <footer className="border-t border-gray-200/60 dark:border-gray-700/60 pt-4">
                  <a
                    href="mailto:gersonsibinde64@gmail.com?subject=Longani%20App%20Issue%20Report"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-xs text-gray-700 dark:text-gray-300 hover:underline mb-4"
                  >
                    Reportar um Problema
                  </a>
                  <p className="text-center text-gray-500 dark:text-gray-400 text-xs select-none">
                  © {new Date().getFullYear()} Longani &middot; v.1.0.0 Beta
                  </p>
              </footer>
            </div>
        </div>
      </aside>
    </>
  );
};