import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  workers: 2,
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4189 --strictPort',
    url: 'http://127.0.0.1:4189',
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://127.0.0.1:4189' },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
})
