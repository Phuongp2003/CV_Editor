import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import ui from '@nuxt/ui/vite'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(process.env.VITE_BUILD_TIMESTAMP || Date.now().toString())
  },
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    ui({
      ui: {
        colors: {
          primary: 'blue',
          neutral: 'slate'
        }
      }
    }),
    
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        simple: fileURLToPath(new URL('./simple/index.html', import.meta.url))
      }
    }
  }
})
