import { defineConfig } from 'vite'
import path from "path"
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 5174,   // admin dashboard uses 5173
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries in one stable vendor chunk (cached between app releases, §79). Do not split
        // react / radix / redux into separate chunks: they import each other and the circular
        // chunk imports stop the app from mounting (seen in QA 2026-10-01).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/](socket\.io-client|engine\.io-client|socket\.io-parser|engine\.io-parser|@socket\.io)[\\/]/.test(id)) return 'socket';
          return 'vendor';
        },
      },
    },
  },
})
