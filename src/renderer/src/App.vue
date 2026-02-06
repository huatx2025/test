<script setup>
import { onMounted, ref } from 'vue'
import { useUserStoreHook } from '@/store/modules/user'
import { Spin, ConfigProvider } from 'ant-design-vue'

const userStore = useUserStoreHook()
const isInitializing = ref(true)

// 主题配置 - 使用项目定义的主色调
const themeConfig = {
  token: {
    colorPrimary: '#6666FF',    // 主色调（按钮、链接等）
    colorSuccess: '#52c41a',    // 成功色
    colorWarning: '#faad14',    // 警告色
    colorError: '#ff4d4f',      // 错误色
    colorInfo: '#6666FF',       // 信息色
    borderRadius: 6,            // 圆角大小
  }
}

// 应用启动时刷新 token
onMounted(async () => {
  // 等待token刷新完成后再渲染页面内容
  await userStore.refreshTokenAction()
  isInitializing.value = false
})
</script>

<template>
  <ConfigProvider :theme="themeConfig">
    <div v-if="isInitializing" style="display: flex; align-items: center; justify-content: center; height: 100vh;">
      <Spin size="large" tip="初始化中..." />
    </div>
    <RouterView v-else />
  </ConfigProvider>
</template>

<style scoped>
</style>
