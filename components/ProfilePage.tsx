import React, { useState, useRef } from 'react';
import { CameraIcon, UserIcon } from './Icons';
import { Loader } from './Loader';

// Define a User type to be used across components
export interface User {
  id: string;
  name: string;
  photo?: string | null;
  teamId?: string;
  status?: 'pending' | 'active';
}

interface ProfilePageProps {
  user: User | null;
  onUpdateProfile: (user: User) => void;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdateProfile, onLogout }) => {
  const [name, setName] = useState(user?.name || '');
  const [photoPreview, setPhotoPreview] = useState(user?.photo || null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    window.location.hash = '#/login';
    return null;
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError('A foto do perfil não pode exceder 2MB.');
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('O nome não pode estar em branco.');
      return;
    }
    setError(null);
    setIsSaving(true);
    // Simulate save delay
    setTimeout(() => {
      const updatedUser: User = {
        id: user.id, // Preserve existing ID
        name: name.trim(),
        photo: photoPreview,
        teamId: user.teamId, // Preserve existing teamId
        status: user.status || 'active', // Preserve status, default to active
      };
      onUpdateProfile(updatedUser);
      setIsSaving(false);
      // Optionally navigate away or show a success message
    }, 1000);
  };

  return (
    <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="bg-white/60 dark:bg-gray-800/60 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700 backdrop-blur-sm animate-fade-in-up">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">Meu Perfil</h1>
            
            <div className="flex flex-col items-center gap-4 mb-8">
                <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                        {photoPreview ? (
                            <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                        )}
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-10 h-10 bg-[#24a9c5] rounded-full flex items-center justify-center text-white shadow-md hover:bg-[#1e8a9f] transition-colors"
                        aria-label="Alterar foto do perfil"
                    >
                        <CameraIcon className="w-5 h-5" />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePhotoChange}
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                    />
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Nome de Utilizador
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#24a9c5] focus:border-[#24a9c5] sm:text-sm"
                        />
                    </div>
                </div>

                {error && <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
                
                <div className="mt-6">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#24a9c5] hover:bg-[#1e8a9f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] disabled:bg-gray-400 dark:focus:ring-offset-gray-900 transition-colors"
                    >
                        {isSaving ? <Loader className="w-5 h-5" /> : 'Guardar Alterações'}
                    </button>
                </div>
            </form>

             <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                <button
                    onClick={onLogout}
                    className="text-sm font-medium text-red-600 dark:text-red-500 hover:underline"
                >
                    Sair da Conta
                </button>
            </div>
        </div>
    </main>
  );
};