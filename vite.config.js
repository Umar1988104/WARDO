import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' makes the build work on any GitHub Pages repo name
export default defineConfig({
  base: './',
  plugins: [react()],
})
