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
        // A página (index.html) NÃO fica guardada no precache: ao abrir o site com internet ela vem sempre da rede, já na
        // versão mais nova (ninguém precisa limpar o cache). Sem internet, ou se a rede demorar mais de 3 s, usa a cópia
        // guardada da última visita. Os outros arquivos têm nome com versão, então podem ficar guardados à vontade.
        globPatterns: ['**/*.{js,css,svg,png,webp,woff,woff2,glb}'],
        navigateFallback: null,
        runtimeCaching: [{
          urlPattern: ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/api'),
          handler: 'NetworkFirst',
          options: { cacheName: 'miniverso-paginas', networkTimeoutSeconds: 3, expiration: { maxEntries: 20 } }
        }],
        cleanupOutdatedCaches: true,
        clientsClaim: true                                    // a versão nova assume as abas assim que é aplicada
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
