import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Use VITE_BASE_PATH if set, otherwise '/' for all builds
  // GitHub Pages deployment should set VITE_BASE_PATH=/r3f-peridot/
  const base = process.env.VITE_BASE_PATH || '/'
  
  return {
    plugins: [react()],
    base,
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
  }
})

