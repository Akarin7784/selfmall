import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'
  return {
    plugins: [
      vue(),
      AutoImport({ resolvers: [ElementPlusResolver()], dts: false }),
      Components({ resolvers: [ElementPlusResolver()], dts: false }),
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      proxy: { '/api': { target: proxyTarget, changeOrigin: true } },
    },
  }
})
