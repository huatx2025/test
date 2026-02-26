<template>
  <a-dropdown
    :trigger="trigger"
    :placement="placement"
    :disabled="disabled"
  >
    <slot>
      <a-button type="primary">
        <template #icon>
          <PlusOutlined />
        </template>
        创建
      </a-button>
    </slot>
    <template #overlay>
      <a-menu class="wechat-create-menu" @click="handleMenuClick">
        <a-menu-item key="new">
          <FileTextOutlined />
          <span>新建文章</span>
        </a-menu-item>
        <a-menu-item key="select">
          <AppstoreOutlined />
          <span>选择已有内容</span>
        </a-menu-item>
        <a-menu-item key="graphic">
          <PictureOutlined />
          <span>图文</span>
        </a-menu-item>
        <a-menu-item key="video">
          <VideoCameraOutlined />
          <span>视频消息</span>
        </a-menu-item>
        <a-menu-item key="audio">
          <AudioOutlined />
          <span>音频消息</span>
        </a-menu-item>
        <a-menu-item key="reprint">
          <CopyOutlined />
          <span>转载</span>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup>
import { 
  PlusOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  CopyOutlined
} from '@ant-design/icons-vue'

// Props
const props = defineProps({
  // 触发方式
  trigger: {
    type: Array,
    default: () => ['click']
  },
  // 弹出位置
  placement: {
    type: String,
    default: 'bottomRight'
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['action'])

// 操作类型对应的标题
const actionTitles = {
  new: '新建文章',
  select: '选择已有内容',
  graphic: '图文',
  video: '视频消息',
  audio: '音频消息',
  reprint: '转载'
}

// 构建微信公众号编辑器URL
const buildEditorUrl = (type, token, appmsgId = null) => {
  if (appmsgId) {
    // 编辑草稿
    return `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${appmsgId}&isMul=1&replaceScene=0&isSend=0&isFreePublish=0&token=${token}&lang=zh_CN`
  }

  // 根据类型构建URL
  switch (type) {
    case 'new':
      // 新建文章
      return `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&token=${token}&lang=zh_CN`
    case 'select':
      // 选择已有内容
      return `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&createType=100&token=${token}&lang=zh_CN`
    case 'graphic':
      // 图文
      return `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&createType=8&token=${token}&lang=zh_CN`
    case 'video':
      // 视频消息
      return `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&createType=5&token=${token}&lang=zh_CN`
    case 'audio':
      // 音频消息
      return `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&createType=7&token=${token}&lang=zh_CN`
    case 'reprint':
      // 转载
      return `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&share=1&token=${token}&lang=zh_CN`
    default:
      return `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&token=${token}&lang=zh_CN`
  }
}

// 处理菜单点击
const handleMenuClick = ({ key }) => {
  emit('action', {
    type: key,
    title: actionTitles[key] || '新建文章',
    buildUrl: (token, appmsgId = null) => buildEditorUrl(key, token, appmsgId)
  })
}

// 暴露方法供外部使用
defineExpose({
  buildEditorUrl,
  actionTitles
})
</script>

<style scoped lang="scss">
.wechat-create-menu {
  :deep(.ant-dropdown-menu-item) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    
    .anticon {
      font-size: 16px;
      color: #6b7280;
      margin-right: 8px;
    }

    span {
      font-size: 14px;
    }

    &:hover {
      .anticon {
        color: var(--color-primary);
      }
    }
  }
}
</style>

