import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    // Force Vite to always resolve these to a single copy.
    // Multiple copies of stellar-base in the bundle cause
    // "Bad union switch" XDR errors at runtime.
    dedupe: [
      '@stellar/stellar-sdk',
      '@stellar/stellar-base',
    ],
    alias: {
      buffer: 'buffer',
      // Hard-pin stellar-base to the top-level copy
      '@stellar/stellar-base': path.resolve('./node_modules/@stellar/stellar-base'),
    },
  },
  optimizeDeps: {
    include: ['buffer', '@stellar/stellar-sdk', '@stellar/stellar-base'],
    // Force re-bundle on every start so stale cache never causes issues
    force: true,
  },
  build: {
    // Raise the warning threshold — stellar-sdk is inherently large
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split vendor libraries into a separate chunk for better caching
        manualChunks: {
          'stellar-sdk': ['@stellar/stellar-sdk', '@stellar/stellar-base'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
