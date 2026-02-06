import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

// 核心：根据命令区分开发/生产环境
export default defineConfig(({ command }) => {
  const isDev = command === 'serve' // dev 是开发，build 是生产

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      build: {
        copyPublicDir: true,
        // 生产环境压缩主进程代码
        minify: !isDev
      },
      publicDir: resolve(__dirname, 'resources')
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        // 仅开发环境开启 watch，生产打包关闭（核心修复）
        watch: isDev ? {} : false,
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'src/preload/index.js'),
            'webview-auth-preload': resolve(__dirname, 'src/preload/webview-auth-preload.js')
          }
        },
        // 生产环境压缩预加载脚本
        minify: !isDev
      }
    },
    renderer: {
      resolve: {
        alias: {
          // 简化别名，避免冗余
          '@': resolve(__dirname, 'src/renderer/src')
        }
      },
      plugins: [
        vue({
          template: {
            compilerOptions: {
              isCustomElement: (tag) => tag === 'webview'
            }
          }
        })
      ],
      build: {
        // 生产环境压缩渲染进程代码
        minify: !isDev,
        // 适配项目中的大视频/图片文件，避免打包警告
        chunkSizeWarningLimit: 2000,
        // 禁用 brotli 压缩（国内打包速度慢）
        brotliSize: false
      }
    }
  }
})
