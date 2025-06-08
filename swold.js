/*self.addEventListener(install e => {
  e.waitUntil(
    caches.open("static").then(cache => {
      return cache.addAll(["./"]);
    })
  );
});

self.addEventListener("fetch" e => {
  e.respondWith(
    caches.match(e.request).then(responce => {
      return responce || fetch(e.request);
    })
  );
});*/

// This code executes in its own worker or thread
self.addEventListener("install", event => {
   console.log("Service worker installed");
});

const urlsToCache = ["/", "index.html", "show-finder.html", "movie-finder.html", "show-finder.js", "movie-finder.js", "styles.css", "logo.png"];
self.addEventListener("install", event => {
   event.waitUntil(
      caches.open("pwa-assets")
      .then(cache => {
         return cache.addAll(urlsToCache);
      });
   );
});

self.addEventListener("activate", event => {
   console.log("Service worker activated");
});
