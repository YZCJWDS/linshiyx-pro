import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'https://api.npu.codes'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug']
        }
      },
      rollupOptions: {
        external: [],
        output: {
          manualChunks: undefined
        }
      }
    },
    optimizeDeps: {
      include: ['axios', 'vue', 'naive-ui', '@vicons/ionicons5']
    },
    server: {
      port: env.PORT ? Number(env.PORT) : 3000,
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
        '/admin': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        },
        '/telegram': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
        }
      }
    }
  }
})
