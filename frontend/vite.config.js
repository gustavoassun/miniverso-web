import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['miniverso-icon.svg', 'icons/*.png'],
      manifest: {
        name: 'Miniverso',
        short_name: 'Miniverso',
        description: 'Experiências imersivas para transformar desafios reais.',
        theme_color: '#0a0b16',
        background_color: '#07131f',
        display: 'standalone',
        start_url: '/',
        id: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,glb}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
        cleanupOutdatedCaches: true
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5187,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
