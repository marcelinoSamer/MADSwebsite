import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // A different port from the site so both can run at once during
  // development. strictPort so a clash fails loudly rather than landing the
  // admin panel on whatever port happens to be free.
  server: { port: 5174, strictPort: true },
  test: {
    name: 'admin',
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
})
