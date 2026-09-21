import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // strictPort so a stale server fails loudly instead of silently moving the
  // app to another port — with both apps starting together, a silent shuffle
  // means you end up testing the wrong one.
  server: { port: 5173, strictPort: true },
  test: {
    name: 'site',
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
})
