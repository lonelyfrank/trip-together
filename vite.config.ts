import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiOrigin = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const apiPattern = apiOrigin ? new RegExp(`^${apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/rest/v1/`) : /^$/
  return {
    plugins: [react(), tailwindcss(), basicSsl(), VitePWA({
      // Un aggiornamento attende la chiusura delle schede: non ricaricare un form
      // aperto o interrompere la sincronizzazione della coda locale.
      registerType: 'prompt',
      injectRegister: 'script',
      includeAssets: ['favicon.svg'],
      manifest: {
        id: '/', name: 'Trip Together', short_name: 'Trip Together',
        description: 'Organizza eventi, passaggi e spese con il tuo gruppo.',
        lang: 'it', start_url: '/', scope: '/', display: 'standalone',
        theme_color: '#f8fafc', background_color: '#f8fafc',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,png}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [{
          urlPattern: apiPattern,
          method: 'GET',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'trip-supabase-reads-v1', networkTimeoutSeconds: 3,
            cacheableResponse: { statuses: [200] },
            expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
            plugins: [{
              cacheKeyWillBeUsed: async ({ request }) => {
                // Non condividere risposte fra identità né formati/range diversi.
                // Il token non viene scritto nell'URL o negli header della cache.
                const identity = ['authorization', 'accept', 'range'].map((header) => request.headers.get(header) ?? '').join('\n')
                const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity))
                const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
                const cacheUrl = new URL(request.url)
                cacheUrl.searchParams.set('__tt_identity', hash)
                return new Request(cacheUrl.href)
              },
            }],
          },
        }],
      },
    })],
    build: {
      rollupOptions: {
        output: {
          // Le librerie cambiano solo quando si aggiorna una dipendenza: in un
          // chunk a parte restano in cache fra i deploy invece di essere
          // riscaricate a ogni modifica del codice applicativo. Non riduce il
          // primo caricamento — supabase serve comunque subito — ma evita che
          // 430 kB scadano per una virgola cambiata in un componente.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('@supabase')) return 'vendor-supabase'
            if (id.includes('@tanstack')) return 'vendor-query'
            if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
              return 'vendor-react'
            }
            return undefined
          },
        },
      },
    },
    server: { host: true },
  }
})
