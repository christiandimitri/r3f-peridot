import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use '/' for local dev, '/r3f-peridot/' for GitHub Pages deployment
  base: process.env.NODE_ENV === 'production' && process.env.VITE_BASE_PATH 
    ? process.env.VITE_BASE_PATH 
    : '/',
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    commonjsOptions: {
      // Ensure proper handling of CommonJS modules
      include: [/node_modules/],
    },
  },
  optimizeDeps: {
    // Include Three.js in optimization to ensure single instance
    include: ['three', '@react-three/fiber'],
  },
  resolve: {
    // Dedupe Three.js and R3F to prevent multiple instances
    dedupe: ['three', '@react-three/fiber', 'react', 'react-dom'],
  },
})

