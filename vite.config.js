import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' makes the build work on any GitHub Pages repo name
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // the manifest stays in public/manifest.webmanifest and is linked from index.html
      manifest: false,
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      workbox: {
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,woff2}'],
        runtimeCaching: [
          {
            // The free cutout model is downloaded once from imgly's CDN. Keep it, so cutouts also work offline.
            urlPattern: ({ url }) => url.hostname === 'staticimgly.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'wardo-cutout-model',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
