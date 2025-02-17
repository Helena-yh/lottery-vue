import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

import { compileDefinedValues } from './scripts/constants';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://api-ucqa.rongcloud.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    },
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('rc-'),
        },
      },
    }),
  ],
  root: resolve(__dirname, 'example'),
  build: {
    target: 'es2017',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'example/index.html'),
      },
      output: {
        dir: resolve(__dirname, 'dist'),
      },
    },
    minify: false,
    emptyOutDir: true,
    sourcemap: true,
  },
  base: './',
  resolve: {
    alias: {
      '@rongcloud/global-im-uikit': resolve('./src'),
      vue: resolve('node_modules/vue/dist/vue.esm-bundler.js'),
      '@lib': resolve('./src'),
    },
  },
  // mode: 'development',
  define: compileDefinedValues,
  publicDir: resolve('example/public'),
});
