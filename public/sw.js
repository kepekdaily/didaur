
// Service Worker dinonaktifkan sementara untuk menghindari error origin di lingkungan preview/sandbox.
// Pendaftaran SW akan menyebabkan error jika domain host dan domain script tidak cocok.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
