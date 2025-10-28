import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, UserIcon, InfoIcon } from './Icons';
import { Loader } from './Loader';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from '../types';

export const ProfilePage: React.FC = () => {
  const { user, profile, updateProfile, uploadProfilePhoto, signOut, updateUserEmail } = useAuth();

  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(profile?.photo_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep local state in sync if the profile from context changes
    if (profile) {
      setName(profile.name);
      setPhotoPreview(profile.photo_url || null);
    }
    if (user) {
        setEmail(user.email || '');
    }
  }, [profile, user]);

  if (!profile || !user) {
    // This should ideally not happen if the page is protected, but as a safeguard:
    return <div className="flex-grow flex items-center justify-center"><Loader /></div>;
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError('A foto do perfil não pode exceder 2MB.');
        return;
      }
      setError(null);
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('O nome não pode estar em branco.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      let photoUrl = profile.photo_url;
      let emailUpdateMessage = '';

      // 1. Update email if changed
      if (email.trim() !== user.email) {
          const { error: emailError } = await updateUserEmail(email.trim());
          if (emailError) throw emailError;
          emailUpdateMessage = 'Enviámos um email de confirmação para o seu endereço antigo e novo para concluir a alteração.';
      }

      // 2. Upload photo if changed
      if (photoFile) {
        const newPhotoUrl = await uploadProfilePhoto(photoFile);
        if (newPhotoUrl) {
          photoUrl = newPhotoUrl;
        }
      }

      // 3. Update profile name and photo URL if they have changed
      const profileUpdates: Partial<Profile> = {};
      if (name.trim() !== profile.name) {
          profileUpdates.name = name.trim();
      }
      if (photoUrl !== profile.photo_url) {
          profileUpdates.photo_url = photoUrl;
      }

      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(profileUpdates);
      }

      setPhotoFile(null); // Reset file state after successful upload
      setSuccessMessage(`Perfil atualizado com sucesso! ${emailUpdateMessage}`);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Não foi possível guardar as alterações.');
    } finally {
      setIsSaving(false);
    }
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
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#24a9c5] focus:border-[#24a9c5] sm:text-sm"
                        />
                    </div>
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
                {successMessage && (
                    <div className="mt-4 text-center text-sm text-green-800 bg-green-100 p-3 rounded-lg border border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800/50 flex items-start gap-2">
                        <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{successMessage}</span>
                    </div>
                )}
                
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
                    onClick={signOut}
                    className="text-sm font-medium text-red-600 dark:text-red-500 hover:underline"
                >
                    Sair da Conta
                </button>
            </div>
        </div>
    </main>
  );
};