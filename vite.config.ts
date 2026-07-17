import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// VITE_BASE_PATH is only needed for GitHub Pages, which serves the app from
// https://<user>.github.io/<repo>/ rather than the domain root. Vercel and
// Netlify serve from the root, so they can ignore this entirely.
const base = process.env.VITE_BASE_PATH ? `/${process.env.VITE_BASE_PATH}/` : '/'

export default defineConfig({
  base,
  plugins: [react()],
  worker: {
    format: 'es'
  },
  build: {
    target: 'esnext',
    sourcemap: true
  }
})
