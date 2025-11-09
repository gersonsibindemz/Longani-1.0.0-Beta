// service-worker.js

const CACHE_NAME = 'longani-cache-v18'; // Incremented cache version
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  '/App.tsx',
  '/services/geminiService.ts',
  '/components/Header.tsx',
  '/components/FileUpload.tsx',
  '/components/TranscriptDisplay.tsx',
  '/components/Loader.tsx',
  '/components/Icons.tsx',
  '/components/ProgressBar.tsx',
  '/utils/audioUtils.ts',
  '/components/HistoryPage.tsx',
  '/components/RecordingsPage.tsx',
  '/components/VoiceRecorder.tsx',
  '/utils/db.ts',
  '/components/DropdownMenu.tsx',
  '/components/PropertiesModal.tsx',
  '/components/TranslationsPage.tsx',
  '/components/RefineModal.tsx',
  '/components/SignUpPage.tsx',
  '/components/ProfilePage.tsx',
  '/components/TeamsPage.tsx',
  '/components/InviteMemberModal.tsx',
  '/components/DesktopNotice.tsx',
  '/components/PlansPage.tsx',
];

// Install event: open a cache and add the core app shell files to it.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Service Worker: Failed to cache one or more files during install:', error);
        });
      })
  );
});

// Activate event: clean up old caches and take control of clients.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message event: listen for a message from the client to skip waiting.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


// Fetch event: Implements a robust strategy for both navigation and asset requests.
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
      return;
  }

  // For navigation requests (e.g., loading the app), use a "Network-first" strategy.
  // This ensures the user always gets the latest HTML shell when they are online,
  // preventing the app from breaking after a deployment. The cache is a fallback for offline use.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If the network fails, serve the cached index.html.
        return caches.match('/index.html');
      })
    );
    return;
  }

  // For all other requests (assets like scripts, styles), use a "Cache-first" strategy.
  // These assets are versioned by the cache name, so this is fast and reliable.
  // If an asset isn't in the cache, it will be fetched from the network.
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});