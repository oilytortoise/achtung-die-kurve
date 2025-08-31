import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['phaser'],
          socket: ['socket.io-client']
        }
      }
    },
    // Increase chunk size warning limit since Phaser is large
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // Ensure proper module resolution
  optimizeDeps: {
    include: ['phaser', 'socket.io-client']
  }
})
