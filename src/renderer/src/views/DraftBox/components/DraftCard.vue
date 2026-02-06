<template>
  <div class="draft-card" :class="{ 'is-selected': isSelected }" @click="handleClick">
    <!-- 头图 -->
    <div class="draft-card-cover">
      <ProxyImage
        v-if="mainArticle.cover"
        :src="mainArticle.cover" 
        :alt="mainArticle.title"
        image-class="cover-image"
      />
      <!-- 标题覆盖在封面底部 -->
      <div class="cover-title-overlay">
        <div class="title-wrapper">
          <h3 class="article-title" v-html="mainArticle.title || '无标题'"></h3>
          <svg v-if="mainArticle.share_page_type === 8" class="image-type-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="draft-card-content">
      <!-- 摘要 -->
      <!-- <div v-if="mainArticle.digest" class="main-article-info">
        <p class="article-digest" v-html="mainArticle.digest"></p>
      </div> -->

      <!-- 多图文列表 -->
      <div v-if="subArticles.length > 0" class="sub-articles">
        <div 
          v-for="(article, index) in subArticles" 
          :key="index"
          class="sub-article-item"
        >
          <div class="sub-article-info">
            <h4 class="sub-article-title" v-html="article.title || '无标题'"></h4>
          </div>
          <div class="sub-cover-wrapper">
            <ProxyImage
              v-if="article.cover"
              :src="article.cover" 
              :alt="article.title"
              image-class="sub-cover-image"
            />
          </div>
        </div>
      </div>

      <!-- 时间信息 -->
      <div class="draft-card-time">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        {{ formatTime(draftData.update_time) }}
      </div>
      
      <!-- 操作按钮栏 -->
      <div class="draft-card-footer">
        <a-button type="text" size="small" class="action-btn" @click.stop="handlePublish">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13"></path>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
          </svg>
          发布
        </a-button>
        
        <a-button type="text" size="small" class="action-btn" @click.stop="handleSync">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
          </svg>
          同步
        </a-button>
        
        <a-button type="text" size="small" class="action-btn" @click.stop="handleEdit">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          编辑
        </a-button>
        
        <a-button type="text" size="small" class="action-btn danger" @click.stop="handleDelete">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          删除
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Button as AButton } from 'ant-design-vue'
import ProxyImage from '@/components/common/ProxyImage.vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

// 配置 dayjs
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const props = defineProps({
  draftData: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'publish', 'sync', 'select'])

// 主图文（第一篇）
const mainArticle = computed(() => {
  const items = props.draftData.multi_item || []
  return items[0] || {}
})

// 子图文（除第一篇外的其他文章）
const subArticles = computed(() => {
  const items = props.draftData.multi_item || []
  return items.slice(1)
})

// 文章总数
const articleCount = computed(() => {
  return (props.draftData.multi_item || []).length
})

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  // 将字符串时间戳转换为数字
  const time = parseInt(timestamp) * 1000
  const date = dayjs(time)
  const now = dayjs()
  
  const diffDays = now.diff(date, 'day')
  const diffHours = now.diff(date, 'hour')
  const diffMinutes = now.diff(date, 'minute')
  
  const timeStr = date.format('HH:mm')
  
  // 判断是否是今天
  const isToday = date.format('YYYY-MM-DD') === now.format('YYYY-MM-DD')
  // 判断是否是昨天
  const isYesterday = date.format('YYYY-MM-DD') === now.subtract(1, 'day').format('YYYY-MM-DD')
  
  // 1分钟内
  if (diffMinutes < 1) {
    return '刚刚更新'
  }
  // 1小时内
  else if (diffHours < 1) {
    return `更新于 ${date.fromNow()}` // "3分钟前"
  }
  // 今天
  else if (isToday) {
    return `更新于 今天 ${timeStr}`
  }
  // 昨天
  else if (isYesterday) {
    return `更新于 昨天 ${timeStr}`
  }
  // 当年
  else if (date.year() === now.year()) {
    return `更新于 ${date.format('MM-DD HH:mm')}`
  }
  // 跨年
  else {
    return `更新于 ${date.format('YYYY-MM-DD HH:mm')}`
  }
}

// 处理卡片点击 - 切换选中状态
const handleClick = () => {
  emit('select', props.draftData, !props.isSelected)
}

// 处理编辑
const handleEdit = () => {
  emit('edit', props.draftData)
}

// 处理删除
const handleDelete = () => {
  emit('delete', props.draftData)
}

// 处理发布
const handlePublish = () => {
  emit('publish', props.draftData)
}

// 处理同步
const handleSync = () => {
  emit('sync', props.draftData)
}
</script>

<style scoped lang="scss">
.draft-card {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  position: relative;
  
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
    
    .draft-card-cover :deep(.cover-image) {
      transform: scale(1.05);
    }
  }
  
  &.is-selected {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
}

.draft-card-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #E3E4E5;
  flex-shrink: 0;
  position: relative;
}

.cover-image {
  transition: transform 0.3s ease;
}

.cover-title-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.4) 70%, transparent 100%);
  
  .title-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  
  .article-title {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    color: #ffffff;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-all;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    flex: 1;
    
    :deep(em) {
      font-style: normal;
      color: #ffd700;
    }
  }
  
  .image-type-icon {
    width: 20px;
    height: 20px;
    color: #ffffff;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    flex-shrink: 0;
    margin-top: 2px;
  }
}

.draft-card-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.main-article-info {
  padding: 12px 16px;
}

.article-digest {
  margin: 0;
  font-size: 13px;
  color: #8c8c8c;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  
  :deep(em) {
    font-style: normal;
    color: #1890ff;
    background: #e6f7ff;
    padding: 1px 3px;
    border-radius: 2px;
  }
}

.sub-articles {
  border-top: 1px solid #f0f0f0;
  padding: 0 16px;
}

.sub-article-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
}

.sub-article-info {
  flex: 1;
  min-width: 0;
}

.sub-article-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #595959;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  
  :deep(em) {
    font-style: normal;
    color: #1890ff;
    background: #e6f7ff;
    padding: 1px 3px;
    border-radius: 2px;
  }
}

.sub-cover-wrapper {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: #E3E4E5;
  position: relative;
}

.draft-card-time {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;

  font-size: 12px;
  color: #8c8c8c;
  
  .icon {
    width: 14px;
    height: 14px;
  }
}

.draft-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8px 12px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
  margin-top: auto;
}

.action-btn {
  flex: 1;
  padding: 6px 8px;
  height: auto;
  color: #595959;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 4px;
  font-size: 13px;
  
  .icon {
    width: 14px;
    height: 14px;
  }
  
  &:hover {
    color: #1890ff;
    background: #e6f7ff;
  }
  
  &.danger:hover {
    color: #ff4d4f;
    background: #fff1f0;
  }
}
</style>

