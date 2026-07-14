// 只快取「殼層」靜態資源，讓 PWA 離線也能開起來看到畫面骨架。
// Firestore 的資料一律走網路，不快取，確保四人看到的狀態是即時的。
// 每次改動靜態檔案時記得把 CACHE_NAME 版本號往上加，否則使用者會吃到舊快取。

const CACHE_NAME = "xiaoxiao-dorm-shell-v19";

const SHELL_ASSETS = [
  "index.html",
  "login.html",
  "dorm-select.html",
  "app.html",
  "manifest.json",
  "css/base.css",
  "css/login.css",
  "css/dorm-select.css",
  "css/app.css",
  "js/firebase-config.js",
  "js/auth.js",
  "js/dorm-select.js",
  "js/app.js",
  "js/store.js",
  "js/db/accounts.js",
  "js/db/dorms.js",
  "js/db/members.js",
  "js/db/rooms.js",
  "js/db/duties.js",
  "js/db/messages.js",
  "js/db/pet.js",
  "js/views/map.js",
  "js/views/duties.js",
  "js/views/messages.js",
  "js/views/pet.js",
  "js/views/status.js",
  "js/views/ambience.js",
  "js/views/decorations.js",
  "assets/sprites/furniture/bedSingle_SE.png",
  "assets/sprites/furniture/loungeSofa_SE.png",
  "assets/sprites/furniture/tableCoffee_SE.png",
  "assets/sprites/furniture/rugRounded_SE.png",
  "assets/sprites/furniture/desk_SE.png",
  "assets/sprites/furniture/pottedPlant_SE.png",
  "assets/sprites/furniture/televisionModern_SE.png",
  "assets/sprites/furniture/bookcaseClosed_SE.png",
  "assets/sprites/furniture/lampRoundFloor_SE.png",
  // 背景音效檔案(assets/sounds/*)不預先快取：檔案較大(每個 0.5~1.6MB)，
  // 只有使用者真的點了背景音效才需要下載，不用逼所有人一進站就先載這些。
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 只處理同源的靜態檔案請求，Firestore/Firebase Auth 的請求交給瀏覽器直接處理
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
