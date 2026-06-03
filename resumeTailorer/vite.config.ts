import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/job-tools/resumeTailorer/',
  server: { port: 5173, strictPort: true },
})
