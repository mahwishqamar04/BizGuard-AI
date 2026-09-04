import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  const env = loadEnv(mode, process.cwd())
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:5000'

  return defineConfig({
    plugins: [react()],
    // In production, serve all assets under the /BizGuard-AI/ subpath so the
    // SPA works when hosted at http://localhost/BizGuard-AI/ (XAMPP htdocs).
    // In development the default base (/) is correct for the Vite dev server.
    base: mode === 'production' ? '/BizGuard-AI/' : '/',
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
