import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const raw = env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'
  let apiOrigin = 'http://127.0.0.1:5000'
  try {
    const normalized = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `http://${raw}`
    apiOrigin = new URL(normalized).origin
  } catch {
    /* keep default origin */
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'inject-api-preconnect',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            /** Early connection setup for Flask API — trims critical-path DNS/TLS latency. */
            return html.replace(
              '<head>',
              `<head>
    <link rel="dns-prefetch" href="${apiOrigin}" />
    <link rel="preconnect" href="${apiOrigin}" crossorigin />`,
            )
          },
        },
      },
    ],
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssMinify: true,
      cssCodeSplit: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return
            }
            if (id.includes('react-router')) {
              return 'react-router-vendor'
            }
            if (id.includes('react-dom')) {
              return 'react-dom-vendor'
            }
            if (id.includes('node_modules/react/')) {
              return 'react-core-vendor'
            }
            return 'vendor'
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          url: 'http://localhost',
        },
      },
      /** Avoid worker isolation issues with Node experimental localStorage and jsdom globals */
      pool: 'forks',
      maxConcurrency: 1,
      sequence: {
        shuffle: false,
      },
      fileParallelism: false,
      setupFiles: ['./src/test/polyfill-storage.ts', './src/test/setup.ts'],
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      css: true,
    },
  }
})
