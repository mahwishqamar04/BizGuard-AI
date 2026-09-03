import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  const env = loadEnv(mode, process.cwd())
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:5000'

  return defineConfig({
    plugins: [react()],
    server: {
      // In development, proxy /api requests to the backend server.
      // This allows the frontend to use relative URLs (/api/ai/*)
      // without hardcoding the backend host.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  })
})
