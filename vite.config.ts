/// <reference types="vitest" />
import legacy from '@vitejs/plugin-legacy';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars (including ports)
  const env = loadEnv(mode, process.cwd(), ['CLIENT_', 'SERVER_']);

  return {
    plugins: [
      vue(),
      legacy()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@client': path.resolve(__dirname, './src/client'),
        '@server': path.resolve(__dirname, './src/server'),
        '@config': path.resolve(__dirname, './src/config'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@components': path.resolve(__dirname, './src/client/components'),
        '@views': path.resolve(__dirname, './src/client/views')
      },
    },
    server: {
      port: parseInt(env.CLIENT_PORT || '5173'), // Use configured port
      proxy: {
        '/api': {
          target: `http://localhost:${env.SERVER_PORT || 3001}`,
          changeOrigin: true
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom'
    }
  };
});