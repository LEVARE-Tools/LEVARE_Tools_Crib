/* ==========================================
SERVICE WORKER - EXCEL PWA
Versión: v1.0.0
   ========================================== */

const CACHE_VERSION = "v2.0.0";
const CACHE_NAME = `excelpwa-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    "./",
    "./index.html",
    "./css/style.css",
    "./js/app.js",
    "./manifest.json",
    "./service-worker.js",
    "./js/firebase.js",
    "./assets/images/logo.svg",
];

/* =========================
INSTALACIÓN
========================= */
self.addEventListener("install", event => {
    console.log("Service Worker instalándose...");

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log("Cache abierto:", CACHE_NAME);
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

/* =========================
ACTIVACIÓN
========================= */
self.addEventListener("activate", event => {
    console.log("Service Worker activado");

    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log("Eliminando cache antiguo:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

/* =========================
FETCH (Estrategia híbrida)
========================= */
self.addEventListener("fetch", event => {

    // SOLO manejar GET
    if (event.request.method !== "GET") return;

    event.respondWith(
        fetch(event.request)
            .then(response => {

                // Guardar copia dinámica
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                    .then(cache => cache.put(event.request, responseClone));

                return response;

            })
            .catch(() => {
                return caches.match(event.request)
                    .then(cachedResponse => {
                        return cachedResponse || caches.match("/index.html");
                    });
            })
    );
});