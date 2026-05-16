import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
})
