import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    // bind mount no Docker não propaga eventos de arquivo de forma confiável
    watch: { usePolling: true },
  },
})
