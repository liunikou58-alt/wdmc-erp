import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@components': path.resolve(__dirname, '../shared/components'),
    }
  },
  server: {
    port: 5174,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:3002',
      '/uploads': 'http://localhost:3002',
      '/ws': { target: 'ws://localhost:3002', ws: true }
    }
  }
})
