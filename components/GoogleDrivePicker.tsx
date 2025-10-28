import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from './Loader';

// These will be populated by the dynamically loaded scripts
declare const gapi: any;
declare const google: any;

declare global {
    interface Window {
      gapi: any;
      google: any;
    }
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

interface GoogleDrivePickerProps {
  onFileImported: (file: File) => void;
}

type PickerStatus = 'loading' | 'ready' | 'error';

const loadGoogleApiScripts = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.gapi && window.google?.accounts?.oauth2) {
        return resolve();
      }
  
      let gapiLoaded = !!window.gapi;
      let gisLoaded = !!window.google?.accounts;
  
      const checkCompletion = () => {
        if (gapiLoaded && gisLoaded) {
          if ((window as any).gapiLoaded) delete (window as any).gapiLoaded;
          if ((window as any).gisLoaded) delete (window as any).gisLoaded;
          resolve();
        }
      };
      
      (window as any).gapiLoaded = () => {
        gapiLoaded = true;
        checkCompletion();
      };
      (window as any).gisLoaded = () => {
        gisLoaded = true;
        checkCompletion();
      };
  
      const appendScript = (id: string, src: string, onloadCallbackName: string) => {
          if (document.getElementById(id)) {
              if (id === 'gapi-script' && window.gapi) (window as any).gapiLoaded();
              if (id === 'gis-script' && window.google?.accounts) (window as any).gisLoaded();
              return;
          }
          const script = document.createElement('script');
          script.id = id;
          script.src = `${src}?onload=${onloadCallbackName}`;
          script.async = true;
          script.defer = true;
          script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
          document.body.appendChild(script);
      };
      
      appendScript('gapi-script', 'https://apis.google.com/js/api.js', 'gapiLoaded');
      appendScript('gis-script', 'https://accounts.google.com/gsi/client', 'gisLoaded');
    });
  };

export const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({ onFileImported }) => {
    const [status, setStatus] = useState<PickerStatus>('loading');
    const [error, setError] = useState<string | null>(null);
    const tokenClientRef = useRef<any>(null);

    const createPicker = useCallback((accessToken: string) => {
        const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
            .setIncludeFolders(false)
            .setMimeTypes('audio/mpeg,audio/wav,audio/x-wav,audio/webm,audio/aac,audio/m4a,audio/flac,audio/ogg');

        const pickerCallback = async (data: any) => {
            if (data.action === google.picker.Action.PICKED) {
                const doc = data.docs[0];
                const fileId = doc.id;
                const fileName = doc.name;
                
                try {
                    const response = await gapi.client.drive.files.get({
                        fileId: fileId,
                        alt: 'media',
                    });
                    
                    const fileBlob = new Blob([response.body], { type: response.headers['Content-Type'] });
                    const file = new File([fileBlob], fileName, { type: fileBlob.type });
                    onFileImported(file);

                } catch (err: any) {
                    console.error('Error importing from Drive:', err);
                    setError(err.result?.error?.message || 'Não foi possível importar o ficheiro selecionado.');
                }
            }
        };

        const picker = new google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(accessToken)
            .setDeveloperKey(GOOGLE_API_KEY!)
            .setCallback(pickerCallback)
            .build();
        
        picker.setVisible(true);
    }, [onFileImported]);

    useEffect(() => {
        const initialize = async () => {
            if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) {
                setError('A funcionalidade do Google Drive não está configurada.');
                setStatus('error');
                return;
            }
    
            try {
                await loadGoogleApiScripts();
                
                await new Promise<void>((resolve, reject) => {
                    gapi.load('client:picker', () => {
                        gapi.client.init({
                            apiKey: GOOGLE_API_KEY,
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                        }).then(() => {
                            tokenClientRef.current = google.accounts.oauth2.initTokenClient({
                                client_id: GOOGLE_CLIENT_ID,
                                scope: SCOPES,
                                callback: (tokenResponse: any) => {
                                    if (tokenResponse && tokenResponse.access_token) {
                                        createPicker(tokenResponse.access_token);
                                    }
                                },
                            });
                            resolve();
                        }).catch((err: any) => {
                             console.error("Error initializing gapi client:", err);
                             reject(err);
                        });
                    });
                });

                setStatus('ready');

            } catch (err) {
                console.error("Error initializing Google Drive Picker:", err);
                const message = err instanceof Error ? err.message : "Um erro desconhecido ocorreu.";
                setError(`Não foi possível carregar a integração com o Google Drive. ${message}`);
                setStatus('error');
            }
        };

        initialize();
    }, [createPicker]);

    const handleImportClick = () => {
        if (tokenClientRef.current) {
            tokenClientRef.current.requestAccessToken({ prompt: '' });
        } else {
            setError('O cliente de autenticação não está pronto.');
        }
    };

    if (status === 'error') {
        return (
             <div className="w-full text-center text-sm text-red-600 dark:text-red-400">{error}</div>
        );
    }

    return (
        <button
            type="button"
            onClick={handleImportClick}
            disabled={status !== 'ready'}
            className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 transition-colors duration-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
        >
            {status !== 'ready' ? (
                <Loader className="w-5 h-5" />
            ) : (
                <></>
            )}
            <span className="truncate max-w-xs">Importar do Google Drive</span>
        </button>
    );
};