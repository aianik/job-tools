import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/job-tools/',
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/job-tools/resumeTailorer': 'http://localhost:5173',
      '/job-tools/coverLetterAdapter': 'http://localhost:5175',
    },
  },
})
