import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: fileURLToPath(new URL('./__tests__/setup.js', import.meta.url)),
    css: true,
    // Zona horaria fija: las pruebas de fechas deben dar lo mismo en cualquier máquina o CI
    env: { TZ: 'America/Bogota' },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
