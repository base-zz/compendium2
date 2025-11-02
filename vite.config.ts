/// <reference types="vitest" />
import legacy from '@vitejs/plugin-legacy';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      vue(),
      legacy()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@server': path.resolve(__dirname, './src/server'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@components': path.resolve(__dirname, './src/components'),
        '@views': path.resolve(__dirname, './src/views')
      },
    },
    server: {
      host: 'compendium.local',
      port: 5173,
      strictPort: true,
      // Disable HTTPS for local development
      https: undefined,
      hmr: {
        host: 'compendium.local',
        protocol: 'ws', // Use WS instead of WSS
        port: 24678
      },
      allowedHosts: [
        'compendium.local',
        'localhost',
        '127.0.0.1'
      ],
      proxy: {
        '/api': {
          target: `http://compendium.local:3001`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom'
    }
  };
});