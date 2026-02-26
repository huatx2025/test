// electron.vite.config.mjs
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
// 动态获取项目根目录（核心：替换硬编码路径）
import { fileURLToPath } from 'url'
const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ command }) => {
  // 判断环境：dev 开发环境，build 生产打包环境
  const isDev = command === 'serve'

  return {
    main: {
      plugins: [externalizeDepsPlugin()]
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        // 仅开发环境开启 watch，生产打包关闭（避免构建异常）
        watch: isDev ? {} : false,
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'src/preload/index.js'),
            'wechat-mp-editor': resolve(__dirname, 'src/preload/wechat-mp-editor/index.js'),
            'webview-auth-preload': resolve(__dirname, 'src/preload/webview-auth-preload.js')
          }
        }
      }
    },
    renderer: {
      resolve: {
        alias: {
          // 简化别名：保留 @ 即可，避免重复
          '@': resolve(__dirname, 'src/renderer/src')
        }
      },
      plugins: [
        vue({
          template: {
            compilerOptions: {
              // 兼容 webview 自定义标签（Electron 内嵌网页用）
              isCustomElement: (tag) => tag === 'webview'
            }
          }
        })
      ],
      // 可选：生产打包时压缩代码，减小体积
      build: {
        minify: !isDev,
        chunkSizeWarningLimit: 2000 // 提高 chunk 大小警告阈值（适配你的大视频文件）
      }
    }
  }
})
