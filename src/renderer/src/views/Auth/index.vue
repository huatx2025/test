<template>
  <div class="auth-page">
    <!-- Logo墙背景动画 -->
    <div class="logo-wall-bg">
      <div
        v-for="(row, rowIndex) in logoRows"
        :key="rowIndex"
        class="logo-row"
        :class="[`row-${rowIndex % 4}`]"
        :style="{
          animationDuration: `${35 + rowIndex * 5}s`,
          animationDirection: rowIndex % 2 === 0 ? 'normal' : 'reverse'
        }"
      >
        <div
          v-for="(logo, logoIndex) in row"
          :key="logoIndex"
          class="logo-item"
        >
          <img :src="logo.src" :alt="logo.name" />
        </div>
      </div>
    </div>

    <!-- 窗口控制按钮 -->
    <div class="window-controls">
      <button class="window-btn" @click="minimizeWindow" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <button class="window-btn window-btn-close" @click="closeWindow" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- 登录/注册卡片 -->
    <div class="auth-card" :class="{ 'auth-card-register': !isLogin }">
      <!-- Logo -->
      <div class="auth-logo">
        <img src="@/assets/gqslogo.png" alt="EasyDraft" class="logo-img" />
      </div>

      <!-- Slogan -->
      <p class="auth-slogan">自媒体内容管理工具</p>

      <!-- <p class="auth-subtitle">{{ isLogin ? '登录您的账户以继续' : '注册一个新账户开始使用' }}</p> -->

      <!-- 表单 -->
      <a-form
        ref="formRef"
        :model="formState"
        :rules="formRules"
        layout="vertical"
        class="auth-form"
        @finish="handleSubmit"
      >
          <a-form-item name="username" label="用户名">
            <a-input
              v-model:value="formState.username"
              placeholder="请输入用户名"
              size="large"
              :prefix="h(UserOutlined)"
            />
          </a-form-item>

          <!-- 手机号选项已注释 -->
          <!-- <a-form-item v-if="!isLogin" name="phone" label="手机号">
            <a-input
              v-model:value="formState.phone"
              placeholder="请输入手机号（选填）"
              size="large"
              :prefix="h(PhoneOutlined)"
            />
          </a-form-item> -->

          <a-form-item name="password" label="密码">
            <a-input-password
              v-model:value="formState.password"
              placeholder="请输入密码"
              size="large"
              :prefix="h(LockOutlined)"
            />
          </a-form-item>

          <a-form-item v-if="!isLogin" name="confirmPassword" label="确认密码">
            <a-input-password
              v-model:value="formState.confirmPassword"
              placeholder="请再次输入密码"
              size="large"
              :prefix="h(LockOutlined)"
            />
          </a-form-item>

          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
              class="submit-btn"
            >
              {{ isLogin ? '登 录' : '注 册' }}
            </a-button>
          </a-form-item>
      </a-form>

      <!-- 切换登录/注册 -->
      <div class="auth-switch">
        <span>{{ isLogin ? '还没有账户？' : '已有账户？' }}</span>
        <a-button type="link" @click="toggleMode" class="switch-btn">
          {{ isLogin ? '立即注册' : '立即登录' }}
        </a-button>
      </div>
    </div>

    <!-- 版权信息 -->
    <div class="auth-copyright">
      Copyright © 2026 杭州蜜鹞新媒体科技有限公司 All Rights Reserved.
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
// PhoneOutlined 已注释（手机号选项已移除）
// import { PhoneOutlined } from '@ant-design/icons-vue'
import { useUserStoreHook } from '@/store/modules/user'

// 导入logo图片
import logoBilibili from '@/assets/authbg/bilibili.png'
import logoGongzhonghao from '@/assets/authbg/gongzhonghao.png'
import logoXiaohongshu from '@/assets/authbg/xiaohongshu.png'
import logoWeibo from '@/assets/authbg/weibo.png'
import logoDouyin from '@/assets/authbg/douyin.png'
import logoBaijiahao from '@/assets/authbg/baijiahao.png'
import logoZhihu from '@/assets/authbg/zhihu.png'
import logoShipinhao from '@/assets/authbg/shipinhao.png'

// Logo列表
const logos = [
  { src: logoBilibili, name: 'bilibili' },
  { src: logoGongzhonghao, name: '公众号' },
  { src: logoXiaohongshu, name: '小红书' },
  { src: logoWeibo, name: '微博' },
  { src: logoDouyin, name: '抖音' },
  { src: logoBaijiahao, name: '百家号' },
  { src: logoZhihu, name: '知乎' },
  { src: logoShipinhao, name: '视频号' }
]

// 固定的随机排列（每行不同顺序，但稳定不变）
const rowShuffles = [
  [0, 3, 6, 1, 4, 7, 2, 5],
  [2, 5, 0, 7, 3, 1, 6, 4],
  [4, 1, 7, 2, 6, 0, 5, 3],
  [6, 2, 4, 0, 5, 3, 7, 1],
  [1, 7, 3, 5, 0, 6, 4, 2],
  [5, 0, 2, 6, 1, 4, 3, 7]
]

// 生成多行logo（重复填充足够数量，前后两半相同实现无缝滚动）
const logoRows = computed(() => {
  const rows = []
  const rowCount = 6 // 6行logo
  const logosPerHalf = 12 // 每半部分12个logo

  for (let i = 0; i < rowCount; i++) {
    const row = []
    const shuffle = rowShuffles[i]

    // 生成前半部分
    for (let j = 0; j < logosPerHalf; j++) {
      row.push(logos[shuffle[j % shuffle.length]])
    }
    // 复制一份作为后半部分（实现无缝循环）
    for (let j = 0; j < logosPerHalf; j++) {
      row.push(logos[shuffle[j % shuffle.length]])
    }

    rows.push(row)
  }
  return rows
})

const router = useRouter()
const userStore = useUserStoreHook()

// 是否为登录模式
const isLogin = ref(true)
const loading = ref(false)
const formRef = ref(null)

// 表单数据
const formState = reactive({
  username: '',
  password: '',
  confirmPassword: ''
  // phone: '' // 手机号选项已注释
})

// 密码确认验证
const validateConfirmPassword = async (rule, value) => {
  if (!isLogin.value && value !== formState.password) {
    throw new Error('两次输入的密码不一致')
  }
}

// 表单验证规则
const formRules = computed(() => ({
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, max: 50, message: '用户名长度为 3-50 个字符' }
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, max: 50, message: '密码长度为 6-50 个字符' }
  ],
  confirmPassword: isLogin.value ? [] : [
    { required: true, message: '请确认密码' },
    { validator: validateConfirmPassword }
  ]
  // phone 验证规则已注释
  // phone: [
  //   { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  // ]
}))

// 切换登录/注册模式
const toggleMode = () => {
  isLogin.value = !isLogin.value
  formRef.value?.resetFields()
}

// 提交表单
const handleSubmit = async () => {
  loading.value = true

  try {
    if (isLogin.value) {
      // 登录
      const result = await userStore.loginAction({
        username: formState.username,
        password: formState.password
      })

      if (result.success) {
        message.success('登录成功')
        router.push('/')
      } else {
        message.error(result.message)
      }
    } else {
      // 注册
      const result = await userStore.registerAction({
        username: formState.username,
        password: formState.password
        // phone: formState.phone || undefined // 手机号选项已注释
      })

      if (result.success) {
        message.success('注册成功，请登录')
        isLogin.value = true
        formRef.value?.resetFields()
      } else {
        message.error(result.message)
      }
    }
  } finally {
    loading.value = false
  }
}

// 窗口控制
const minimizeWindow = () => {
  window.electronAPI?.window?.minimize()
}

const closeWindow = () => {
  window.electronAPI?.window?.close()
}
</script>

<style scoped lang="scss">
.auth-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #e8f4fc 0%, #f0f4f8 50%, #e6f2ff 100%);
  overflow: hidden;
  -webkit-app-region: drag;
}

// Logo墙背景
.logo-wall-bg {
  position: absolute;
  top: -100px;
  left: -200px;
  right: -200px;
  bottom: -100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 75px;
  transform: rotate(-12deg);
  pointer-events: none;
  z-index: 0;
}

.logo-row {
  display: flex;
  gap: 30px;
  white-space: nowrap;
  animation: scrollRow 40s linear infinite;

  &.row-0, &.row-2 {
    margin-left: -50px;
  }

  &.row-1, &.row-3 {
    margin-left: -120px;
  }
}

.logo-item {
  flex-shrink: 0;
  width: 230px;
  height: 115px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  opacity: 0.4;
  transition: opacity 0.3s;

  img {
    max-width: 80%;
    max-height: 70%;
    object-fit: contain;
    filter: grayscale(50%);
    opacity: 0.6;
  }
}

@keyframes scrollRow {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

// 窗口控制按钮
.window-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 100;
  -webkit-app-region: no-drag;
}

.window-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  color: #6666FF;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &:hover {
    background: rgba(255, 255, 255, 1);
    color: #5252cc;
  }

  &.window-btn-close:hover {
    background: #ef4444;
    color: #fff;
  }
}

// 登录卡片
.auth-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 420px;
  padding: 42px 35px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.8);
  -webkit-app-region: no-drag;
  animation: slideUp 0.5s ease-out;
  transition: max-width 0.3s ease;

  // 注册模式下更宽
  &.auth-card-register {
    max-width: 480px;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.auth-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;

  .logo-img {
    height: 48px;
    width: auto;
  }
}

.auth-slogan {
  text-align: center;
  font-size: 13px;
  color: #8b94a6;
  margin: 18px 0 18px 0;
  letter-spacing: 1px;
}

.auth-subtitle {
  text-align: center;
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 22px 0;
}

.auth-form {
  :deep(.ant-form-item-label > label) {
    font-weight: 500;
    color: #374151;
  }

  :deep(.ant-input-affix-wrapper) {
    border-radius: 12px;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    transition: all 0.2s;

    &:hover {
      border-color: #9ca3af;
    }

    &:focus,
    &.ant-input-affix-wrapper-focused {
      border-color: #6666FF;
      box-shadow: 0 0 0 3px rgba(102, 102, 255, 0.15);
    }
  }

  :deep(.ant-input) {
    font-size: 15px;
  }
}

.submit-btn {
  height: 52px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  background: #6666FF;
  border: none;
  margin-top: 8px;

  &:hover {
    background: #5252cc;
  }
}

.auth-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24px;
  font-size: 14px;
  color: #6b7280;

  .switch-btn {
    font-weight: 500;
    padding: 0 4px;
  }
}

.auth-copyright {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  color: rgba(107, 114, 128, 0.7);
  z-index: 10;
  -webkit-app-region: no-drag;
}
</style>
