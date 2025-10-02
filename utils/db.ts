const DB_NAME = 'LonganiDB';
const DB_VERSION = 5; // Incremented DB version for folders and tags
const STORE_NAME_TRANSCRIPTIONS = 'transcriptions';
const STORE_NAME_AUDIO = 'audioFiles';
const STORE_NAME_SAVED_TRANSLATIONS = 'savedTranslations';
const STORE_NAME_FOLDERS = 'folders'; // New store for folders

export interface Transcription {
  id: string;
  filename: string;
  date: number;
  rawTranscript: string;
  cleanedTranscript: string;
  audioId?: string;
  isFavorite?: boolean;
  tags?: string[]; // For tagging functionality
  folderId?: string; // For folder organization
  refinedTranscript?: string;
  refinedContentType?: string;
  refinedOutputFormat?: string;
}

export interface AudioRecording {
  id: string;
  name: string;
  date: number;
  type: 'upload' | 'recording';
  audioBlob: Blob;
  isFavorite?: boolean;
  tags?: string[]; // For tagging functionality
}

export interface SavedTranslation {
  id: string;
  transcriptionId: string;
  originalFilename: string;
  date: number;
  targetLanguage: 'en' | 'sn' | string;
  translatedText: string;
  isFavorite?: boolean;
}

export interface Folder {
    id: string;
    name: string;
    date: number;
}

let db: IDBDatabase;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database error:', request.error);
      reject('Error opening database');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      
      if (event.oldVersion < 1) {
        if (!dbInstance.objectStoreNames.contains(STORE_NAME_TRANSCRIPTIONS)) {
          const transcriptionsStore = dbInstance.createObjectStore(STORE_NAME_TRANSCRIPTIONS, { keyPath: 'id' });
          transcriptionsStore.createIndex('date', 'date', { unique: false });
        }
      }

      if (event.oldVersion < 2) {
        if (!dbInstance.objectStoreNames.contains(STORE_NAME_AUDIO)) {
          const audioStore = dbInstance.createObjectStore(STORE_NAME_AUDIO, { keyPath: 'id' });
          audioStore.createIndex('date', 'date', { unique: false });
          audioStore.createIndex('type', 'type', { unique: false });
        }
      }
      
      if (event.oldVersion < 3) {
        const transcriptionsStore = (event.target as IDBOpenDBRequest).transaction.objectStore(STORE_NAME_TRANSCRIPTIONS);
        if (!transcriptionsStore.indexNames.contains('audioId')) {
            transcriptionsStore.createIndex('audioId', 'audioId', { unique: false });
        }
        if (!transcriptionsStore.indexNames.contains('isFavorite')) {
            transcriptionsStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        }
        const audioStore = (event.target as IDBOpenDBRequest).transaction.objectStore(STORE_NAME_AUDIO);
        if (!audioStore.indexNames.contains('isFavorite')) {
            audioStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        }
      }

      if (event.oldVersion < 4) {
        if (!dbInstance.objectStoreNames.contains(STORE_NAME_SAVED_TRANSLATIONS)) {
            const translationsStore = dbInstance.createObjectStore(STORE_NAME_SAVED_TRANSLATIONS, { keyPath: 'id' });
            translationsStore.createIndex('date', 'date', { unique: false });
            translationsStore.createIndex('transcriptionId', 'transcriptionId', { unique: false });
            translationsStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        }
      }

      // Migration for Version 5 (Folders and Tags feature)
      if (event.oldVersion < 5) {
        const transcriptionsStore = (event.target as IDBOpenDBRequest).transaction.objectStore(STORE_NAME_TRANSCRIPTIONS);
        if (!transcriptionsStore.indexNames.contains('tags')) {
            transcriptionsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
        if (!transcriptionsStore.indexNames.contains('folderId')) {
            transcriptionsStore.createIndex('folderId', 'folderId', { unique: false });
        }
        if (!dbInstance.objectStoreNames.contains(STORE_NAME_FOLDERS)) {
            const foldersStore = dbInstance.createObjectStore(STORE_NAME_FOLDERS, { keyPath: 'id' });
            foldersStore.createIndex('name', 'name', { unique: false });
        }
        // Also add tags to the audio files store for consistency
        const audioStore = (event.target as IDBOpenDBRequest).transaction.objectStore(STORE_NAME_AUDIO);
        if (!audioStore.indexNames.contains('tags')) {
            audioStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
      }
    };
  });
}

// --- Transcription Functions ---

export function addTranscription(transcription: Transcription): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME_TRANSCRIPTIONS, 'readwrite');
        const store = transaction.objectStore(STORE_NAME_TRANSCRIPTIONS);
        const request = store.add(transcription);

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error('Error adding transcription:', request.error);
            reject('Could not add transcription to the database.');
        };
    } catch (error) {
        reject(error);
    }
  });
}

export function getTranscriptionById(id: string): Promise<Transcription | undefined> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME_TRANSCRIPTIONS, 'readonly');
        const store = transaction.objectStore(STORE_NAME_TRANSCRIPTIONS);
        const request = store.get(id);
  
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          console.error('Error getting transcription by ID:', request.error);
          reject('Could not retrieve the transcription.');
        };
      } catch (error) {
        reject(error);
      }
    });
}

export function getAllTranscriptions(): Promise<Transcription[]> {
  return new Promise(async (resolve, reject) => {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME_TRANSCRIPTIONS, 'readonly');
        const store = transaction.objectStore(STORE_NAME_TRANSCRIPTIONS);
        const request = store.getAll();

        request.onsuccess = () => {
            const sorted = request.result.sort((a, b) => b.date - a.date);
            resolve(sorted);
        };
        request.onerror = () => {
            console.error('Error getting all transcriptions:', request.error);
            reject('Could not retrieve transcriptions.');
        };
    } catch (error) {
        reject(error);
    }
  });
}

export function deleteTranscription(id: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME_TRANSCRIPTIONS, 'readwrite');
        const store = transaction.objectStore(STORE_NAME_TRANSCRIPTIONS);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
        console.error('Error deleting transcription:', request.error);
        reject('Could not delete transcription.');
        };
    } catch (error) {
        reject(error);
    }
  });
}

// --- Audio File Functions ---

export function addAudioFile(audio: AudioRecording): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME_AUDIO, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_AUDIO);
      const request = store.add(audio);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error adding audio file:', request.error);
        reject('Could not add audio file to the database.');
      };
    } catch (error) {
      reject(error);
    }
  });
}

export function getAudioFile(id: string): Promise<AudioRecording | undefined> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME_AUDIO, 'readonly');
        const store = transaction.objectStore(STORE_NAME_AUDIO);
        const request = store.get(id);
  
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          console.error('Error getting audio file:', request.error);
          reject('Could not retrieve the audio file.');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

export function getAllAudioFiles(): Promise<AudioRecording[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME_AUDIO, 'readonly');
      const store = transaction.objectStore(STORE_NAME_AUDIO);
      const request = store.getAll();

      request.onsuccess = () => {
        const sorted = request.result.sort((a, b) => b.date - a.date);
        resolve(sorted);
      };
      request.onerror = () => {
        console.error('Error getting all audio files:', request.error);
        reject('Could not retrieve audio files.');
      };
    } catch (error) {
      reject(error);
    }
  });
}

export function deleteAudioFile(id: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME_AUDIO, 'readwrite');
      const store = transaction.objectStore(STORE_NAME_AUDIO);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error deleting audio file:', request.error);
        reject('Could not delete audio file.');
      };
    } catch (error) {
      reject(error);
    }
  });
}

// --- Folder Functions ---

export function addFolder(folder: Folder): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(STORE_NAME_FOLDERS, 'readwrite');
            const store = transaction.objectStore(STORE_NAME_FOLDERS);
            store.add(folder).onsuccess = () => resolve();
        } catch (error) {
            reject(error);
        }
    });
}

export function getAllFolders(): Promise<Folder[]> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(STORE_NAME_FOLDERS, 'readonly');
            const store = transaction.objectStore(STORE_NAME_FOLDERS);
            const request = store.getAll();
            request.onsuccess = () => {
                const sorted = request.result.sort((a, b) => a.name.localeCompare(b.name));
                resolve(sorted);
            };
            request.onerror = () => reject('Could not get folders.');
        } catch (error) {
            reject(error);
        }
    });
}

export function updateFolder(id: string, updates: Partial<Folder>): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(STORE_NAME_FOLDERS, 'readwrite');
            const store = transaction.objectStore(STORE_NAME_FOLDERS);
            const request = store.get(id);
            request.onsuccess = () => {
                const item = request.result;
                if (item) {
                    const updatedItem = { ...item, ...updates };
                    store.put(updatedItem).onsuccess = () => resolve();
                } else {
                    reject('Folder not found.');
                }
            };
        } catch (error) {
            reject(error);
        }
    });
}

export function deleteFolder(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction([STORE_NAME_FOLDERS, STORE_NAME_TRANSCRIPTIONS], 'readwrite');
            const foldersStore = transaction.objectStore(STORE_NAME_FOLDERS);
            const transcriptionsStore = transaction.objectStore(STORE_NAME_TRANSCRIPTIONS);
            const folderIndex = transcriptionsStore.index('folderId');
            
            const getReq = folderIndex.getAll(id);
            getReq.onsuccess = () => {
                getReq.result.forEach(t => {
                    delete t.folderId;
                    transcriptionsStore.put(t);
                });
                foldersStore.delete(id);
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject('Transaction failed while deleting folder.');
        } catch (error) {
            reject(error);
        }
    });
}

// --- Generic Update Functions ---

export function updateTranscription(id: string, updates: Partial<Transcription>): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME_TRANSCRIPTIONS, 'readwrite');
        const store = transaction.objectStore(STORE_NAME_TRANSCRIPTIONS);
        const request = store.get(id);
        request.onsuccess = () => {
          const item = request.result;
          if (item) {
            const updatedItem = { ...item, ...updates };
            const updateRequest = store.put(updatedItem);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject('Could not update transcription.');
          } else {
            reject('Transcription not found.');
          }
        };
        request.onerror = () => reject('Could not get transcription to update.');
      } catch (error) {
        reject(error);
      }
    });
  }
  
  export function updateAudioFile(id: string, updates: Partial<AudioRecording>): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME_AUDIO, 'readwrite');
        const store = transaction.objectStore(STORE_NAME_AUDIO);
        const request = store.get(id);
        request.onsuccess = () => {
          const item = request.result;
          if (item) {
            const updatedItem = { ...item, ...updates };
            const updateRequest = store.put(updatedItem);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject('Could not update audio file.');
          } else {
            reject('Audio file not found.');
          }
        };
        request.onerror = () => reject('Could not get audio file to update.');
      } catch (error) {
        reject(error);
      }
    });
  }

// --- Favorites Functions ---

export function updateTranscriptionFavoriteStatus(id: string, isFavorite: boolean): Promise<void> {
    return updateTranscription(id, { isFavorite });
}
  
export function updateAudioFileFavoriteStatus(id: string, isFavorite: boolean): Promise<void> {
    return updateAudioFile(id, { isFavorite });
}

export function getAllFavorites(): Promise<{ transcriptions: Transcription[], audioFiles: AudioRecording[] }> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME_TRANSCRIPTIONS, STORE_NAME_AUDIO], 'readonly');
        
        const transcriptionsStore = transaction.objectStore(STORE_NAME_TRANSCRIPTIONS);
        const audioFilesStore = transaction.objectStore(STORE_NAME_AUDIO);
        
        const allTranscriptionsRequest = transcriptionsStore.getAll();
        const allAudioFilesRequest = audioFilesStore.getAll();

        let transcriptions: Transcription[] = [];
        let audioFiles: AudioRecording[] = [];
        let completed = 0;

        const checkDone = () => {
          if (completed === 2) {
            resolve({ 
              transcriptions: transcriptions.sort((a, b) => b.date - a.date), 
              audioFiles: audioFiles.sort((a, b) => b.date - a.date) 
            });
          }
        };

        allTranscriptionsRequest.onsuccess = () => {
          transcriptions = allTranscriptionsRequest.result.filter(t => t.isFavorite);
          completed++;
          checkDone();
        };
        allAudioFilesRequest.onsuccess = () => {
          audioFiles = allAudioFilesRequest.result.filter(a => a.isFavorite);
          completed++;
          checkDone();
        };
        
        transaction.onerror = (event) => {
            console.error('Transaction error fetching favorites:', (event.target as IDBTransaction).error);
            reject('Transaction failed while fetching favorites.');
        }
        
      } catch (error) {
        reject(error);
      }
    });
}

// --- Saved Translation Functions ---

export function addSavedTranslation(translation: SavedTranslation): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(STORE_NAME_SAVED_TRANSLATIONS, 'readwrite');
            const store = transaction.objectStore(STORE_NAME_SAVED_TRANSLATIONS);
            const request = store.add(translation);
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Could not add saved translation.');
        } catch (error) {
            reject(error);
        }
    });
}

export function getAllSavedTranslations(): Promise<SavedTranslation[]> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(STORE_NAME_SAVED_TRANSLATIONS, 'readonly');
            const store = transaction.objectStore(STORE_NAME_SAVED_TRANSLATIONS);
            const request = store.getAll();
            request.onsuccess = () => {
                const sorted = request.result.sort((a, b) => b.date - a.date);
                resolve(sorted);
            };
            request.onerror = () => reject('Could not retrieve saved translations.');
        } catch (error) {
            reject(error);
        }
    });
}

export function updateSavedTranslation(id: string, updates: Partial<SavedTranslation>): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(STORE_NAME_SAVED_TRANSLATIONS, 'readwrite');
            const store = transaction.objectStore(STORE_NAME_SAVED_TRANSLATIONS);
            const request = store.get(id);
            request.onsuccess = () => {
                const item = request.result;
                if (item) {
                    const updatedItem = { ...item, ...updates };
                    const updateRequest = store.put(updatedItem);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject('Could not update saved translation.');
                } else {
                    reject('Saved translation not found.');
                }
            };
            request.onerror = () => reject('Could not get saved translation to update.');
        } catch (error) {
            reject(error);
        }
    });
}

export function deleteSavedTranslation(id: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await initDB();
            const transaction = db.transaction(STORE_NAME_SAVED_TRANSLATIONS, 'readwrite');
            const store = transaction.objectStore(STORE_NAME_SAVED_TRANSLATIONS);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject('Could not delete saved translation.');
        } catch (error) {
            reject(error);
        }
    });
}