import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// In dev, answer /api/ask with the same code the Vercel function runs.
function askVaultexDev(): Plugin {
  return {
    name: 'ask-vaultex-dev',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', path.resolve(__dirname, '..'), ''))
      server.middlewares.use('/api/ask', async (req, res) => {
        try {
          const { handleAsk } = await server.ssrLoadModule(path.resolve(__dirname, '../api/_lib/ask-core.ts'))
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const controller = new AbortController()
          res.on('close', () => { if (!res.writableEnded) controller.abort() })
          const request = new Request('http://localhost/api/ask', {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
            signal: controller.signal,
          })
          const response: Response = await handleAsk(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          if (!response.body) { res.end(); return }
          const reader = response.body.getReader()
          for (;;) {
            const { value, done } = await reader.read()
            if (done) break
            res.write(value)
          }
          res.end()
        } catch (e) {
          server.config.logger.error(String(e))
          if (!res.headersSent) res.statusCode = 500
          res.end()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    askVaultexDev(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'offline.html', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png'],
      manifest: {
        name: 'Vaultex',
        short_name: 'Vaultex',
        description: 'Run your whole forex company from one place: money, clients, partners and reports.',
        lang: 'en',
        dir: 'ltr',
        theme_color: '#2563eb',
        background_color: '#0f1117',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        scope: '/',
        start_url: '/?source=pwa',
        categories: ['finance', 'business', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', form_factor: 'wide',   label: 'Vaultex FX Dashboard' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', form_factor: 'narrow', label: 'Vaultex FX Mobile' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/offline\.html$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') && url.pathname.includes('GET'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  base: '/',
  server: {
    port: 5176,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
