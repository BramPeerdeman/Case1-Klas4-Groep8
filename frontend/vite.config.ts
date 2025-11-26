import { defineConfig } from 'vite';
export default {
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5299',
        changeOrigin: true,
        secure: false,
        rewrite: (path : string) => path,
      },
    },
  },
};