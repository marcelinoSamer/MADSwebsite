import { defineConfig } from 'vite'

// No jsdom here — the adapter is plain JS and the React bindings are covered
// from the apps that consume them.
export default defineConfig({
  test: {
    name: 'db',
    environment: 'node',
    globals: true,
  },
})
