import { defineConfig } from 'vitest/config'

// One `npm test` at the root runs every workspace's suite. Each workspace
// owns its own environment and setup file via its local vite.config.js, so a
// Node-only package (packages/db) is not forced to boot jsdom.
export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
