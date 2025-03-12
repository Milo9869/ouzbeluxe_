// vite.config.ts (or vitest.config.ts)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/tests/vitest.setup.ts'], // Double-check the path!
    environment: 'jsdom', // Adding jsdom environment
  },
})