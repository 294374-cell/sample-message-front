import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANTE: em produção, o React é servido pelo NGINX (ver
// frontend/nginx.conf), que também faz o proxy de /api/* para o
// backend Laravel. Por isso o código React chama sempre URLs
// relativas (ex.: fetch('/api/messages')).
//
// O proxy abaixo só existe para o modo `npm run dev`, quando você
// está rodando o Vite localmente sem nginx — assim /api ainda
// funciona apontando direto para o Laravel local.
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
