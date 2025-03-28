self.addEventListener("install", (event) => {
  console.log("Service Worker Installed");
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker Activated");
});

// Keep the service worker alive
self.addEventListener("fetch", () => {});