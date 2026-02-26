<template>
  <div class="home-page">
    <div class="home-page-content">
      <!-- 添加账户板块 -->
      <div class="section quick-add-section">
        <div class="section-header">
          <span class="section-title">添加账户</span>
        </div>
        <div class="quick-add-grid">
          <div
            v-for="platform in quickAddPlatforms"
            :key="platform.key"
            class="quick-add-item"
            @click="handleQuickAdd(platform)"
          >
            <div class="platform-icon-wrapper" >
              <img :src="platform.icon" :alt="platform.name" class="platform-icon-img" />
            </div>
            <span class="platform-name">{{ platform.name }}</span>
          </div>
        </div>
      </div>

      <!-- 功能介绍板块 -->
      <div class="section">
        <div class="section-header">
          <span class="section-title">使用教程</span>
        </div>
        <div class="feature-grid">
          <div
            v-for="feature in features"
            :key="feature.key"
            class="feature-item"
            @click="playVideo(feature)"
          >
            <div class="feature-icon" :style="{ color: feature.iconColor }">
              <component :is="feature.icon" />
            </div>
            <div class="feature-info">
              <span class="feature-label">{{ feature.label }}</span>
              <span class="feature-desc">{{ feature.description }}</span>
            </div>
            <!-- 播放按钮图标 -->
            <!-- <div class="play-btn">
              <PlayCircleOutlined />
            </div> -->
          </div>
        </div>
      </div>
    </div>

    <!-- 视频播放弹窗 -->
    <a-modal
      v-model:open="videoModalVisible"
      :title="currentVideoTitle"
      :footer="null"
      :width="800"
      :destroyOnClose="true"
      @cancel="closeVideoModal"
      class="video-modal"
    >
      <div class="video-container">
        <video
          v-if="currentVideoSrc"
          ref="videoRef"
          :src="currentVideoSrc"
          controls
          autoplay
          class="video-player"
        />
      </div>
    </a-modal>

    <!-- 微信公众号登录弹窗 -->
    <WeChatLoginModal
      v-model:open="showWechatLogin"
      @success="handleWechatLoginSuccess"
      @cancel="handleWechatLoginCancel"
    />

    <!-- 通用平台创建弹窗 -->
    <GeneralPlatformModal
      v-model:open="showGeneralPlatformModal"
      :preset-platform="currentPresetPlatform"
      @success="handleGeneralPlatformSuccess"
      @cancel="handleGeneralPlatformCancel"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { UserAddOutlined, DeleteOutlined, SyncOutlined, ImportOutlined, PlayCircleOutlined } from '@ant-design/icons-vue'

// 导入组件
import WeChatLoginModal from '@/components/business/WeChatLoginModal.vue'
import GeneralPlatformModal from '@/components/business/GeneralPlatformModal.vue'

// 导入平台图标
import gzhIcon from '@/assets/platform-icon/gzh.png'
import douyinIcon from '@/assets/platform-icon/douyin.png'
import bilibiliIcon from '@/assets/platform-icon/bilibili.png'
import redbookIcon from '@/assets/platform-icon/redbook.png'

// 导入视频资源（使用 ?url 后缀确保返回正确的 URL）
import videoAccountAdd from '@/assets/video/account-add.mp4?url'
import videoBatchDelete from '@/assets/video/batch-delete.mp4?url'
import videoArticleSync from '@/assets/video/article-sync.mp4?url'
import videoArticleImport from '@/assets/video/article-import.mp4?url'

// 快捷添加平台列表
const quickAddPlatforms = [
  {
    key: 'wechat',
    name: '公众号',
    icon: gzhIcon,
    bgColor: '#f0f9f4'
  },
  {
    key: 'douyin',
    name: '抖音',
    icon: douyinIcon,
    bgColor: '#000000'
  },
  {
    key: 'bilibili',
    name: 'B站',
    icon: bilibiliIcon,
    bgColor: '#fb7299'
  },
  {
    key: 'redbook',
    name: '小红书',
    icon: redbookIcon,
    bgColor: '#ff2442'
  }
]

// 快捷添加弹窗状态
const showWechatLogin = ref(false)
const showGeneralPlatformModal = ref(false)
const currentPresetPlatform = ref('')

// 处理快捷添加平台
const handleQuickAdd = (platform) => {
  if (platform.key === 'wechat') {
    showWechatLogin.value = true
  } else {
    currentPresetPlatform.value = platform.key
    showGeneralPlatformModal.value = true
  }
}

// 微信登录成功
const handleWechatLoginSuccess = () => {
  showWechatLogin.value = false
}

// 微信登录取消
const handleWechatLoginCancel = () => {
  showWechatLogin.value = false
}

// 通用平台创建成功
const handleGeneralPlatformSuccess = () => {
  showGeneralPlatformModal.value = false
  currentPresetPlatform.value = ''
}

// 通用平台创建取消
const handleGeneralPlatformCancel = () => {
  showGeneralPlatformModal.value = false
  currentPresetPlatform.value = ''
}

// 功能介绍列表
const features = [
  {
    key: 'add-account',
    label: '账号添加',
    description: '扫码登录添加公众号',
    icon: UserAddOutlined,
    iconColor: '#3b82f6', // 蓝色 - 添加账号
    video: videoAccountAdd
  },
  // {
  //   key: 'batch-send',
  //   label: '批量群发',
  //   description: '一键群发至多个公众号',
  //   icon: SendOutlined,
  //   iconColor: '#10b981' // 绿色 - 发送
  // },
  {
    key: 'batch-delete',
    label: '批量删稿',
    description: '批量删除草稿',
    icon: DeleteOutlined,
    iconColor: '#ef4444', // 红色 - 删除
    video: videoBatchDelete
  },
  {
    key: 'article-sync',
    label: '文章同步',
    description: '同步文章至其他公众号',
    icon: SyncOutlined,
    iconColor: '#8b5cf6', // 紫色 - 同步
    video: videoArticleSync
  },
  {
    key: 'article-import',
    label: '文章导入',
    description: '从链接导入文章内容',
    icon: ImportOutlined,
    iconColor: '#f59e0b', // 橙色 - 导入
    video: videoArticleImport
  }
]

// 视频弹窗状态
const videoModalVisible = ref(false)
const currentVideoSrc = ref('')
const currentVideoTitle = ref('')
const videoRef = ref(null)

// 播放视频
const playVideo = (feature) => {
  console.log('播放视频:', feature.label, feature.video)
  currentVideoSrc.value = feature.video
  currentVideoTitle.value = `${feature.label}教程`
  videoModalVisible.value = true
  console.log('videoModalVisible:', videoModalVisible.value)
}

// 关闭视频弹窗
const closeVideoModal = () => {
  videoModalVisible.value = false
  currentVideoSrc.value = ''
  currentVideoTitle.value = ''
}
</script>

<style scoped lang="scss">
.home-page {
  width: 100%;
  height: 100%;
  background: #ffffff;
  overflow-y: auto;
}

.home-page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.section {
  // background: #f9fafb;
  border-radius: 12px;
  padding: 20px;
}

/* 快捷添加账户板块 */
.quick-add-section {
  margin-bottom: 8px;
}

.quick-add-grid {
  display: flex;
  gap: 32px;
}

.quick-add-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    .platform-icon-wrapper {
      transform: scale(1.1);
    }
    .platform-name {
      color: #6666FF;
    }
  }
}

.platform-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.platform-icon-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.platform-name {
  font-size: 13px;
  color: #666;
  transition: color 0.2s ease;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.feature-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #ffffff;
  border: 1px solid #e5e7eb;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    transform: translateY(-2px);
  }
}

.feature-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  opacity: 0.7;
  flex-shrink: 0;
  transition: opacity 0.2s ease;

  .feature-item:hover & {
    opacity: 1;
  }
}

.feature-info {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.feature-label {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
}

.feature-desc {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.play-btn {
  margin-left: auto;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #9ca3af;
  border-radius: 50%;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }
}

/* 视频弹窗样式 */
.video-container {
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-player {
  width: 100%;
  max-height: 450px;
  display: block;
}

/* 视频弹窗黑色主题 */
:deep(.ant-modal-content) {
  background: #1a1a1a;
  border-radius: 12px;
}

:deep(.ant-modal-header) {
  background: #1a1a1a;
  border-bottom: 1px solid #333;
}

:deep(.ant-modal-title) {
  color: #fff;
}

:deep(.ant-modal-close) {
  color: #999;

  &:hover {
    color: #fff;
  }
}

:deep(.ant-modal-body) {
  padding: 16px;
  background: #1a1a1a;
}

/* 响应式布局 */
@media (max-width: 900px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
