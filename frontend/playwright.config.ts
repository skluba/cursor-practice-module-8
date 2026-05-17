import { defineConfig } from '@playwright/test'

const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1'
const previewPort = 4173
const devPort = 5173

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  (process.env.CI ? `http://${host}:${previewPort}` : `http://${host}:${devPort}`)

function resolveWebServer():
  | {
      command: string
      url: string
      reuseExistingServer: boolean
      stdout?: 'pipe'
      stderr?: 'pipe'
      timeout: number
    }
  | undefined {
  if (process.env.PLAYWRIGHT_SKIP_WEBSERVER || process.env.PLAYWRIGHT_BASE_URL) {
    return undefined
  }
  if (process.env.CI) {
    return {
      command: `npm run preview -- --host ${host} --port ${previewPort} --strictPort`,
      url: `http://${host}:${previewPort}`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    }
  }
  return {
    command: `npm run dev -- --host ${host} --port ${devPort} --strictPort`,
    url: `http://${host}:${devPort}`,
    reuseExistingServer: true,
    timeout: 120_000,
  }
}

const webServer = resolveWebServer()

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /** Prefer explicit viewport via `test.use` in specs so responsive layouts stay deterministic. */
  projects: [{ name: 'chromium', use: { viewport: { width: 1280, height: 720 } } }],

  webServer,
})
