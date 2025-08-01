import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [react()],
  server: {
    open: true,
    port: 3000
  }
})