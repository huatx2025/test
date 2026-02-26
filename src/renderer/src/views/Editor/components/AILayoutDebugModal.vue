<template>
  <AModal
    v-model:open="visible"
    title="AI 排版调试"
    :width="1000"
    :footer="null"
    :destroyOnClose="true"
    centered
    class="ai-layout-debug-modal"
  >
    <div class="debug-container">
      <!-- 操作栏 -->
      <div class="action-bar">
        <AButton type="primary" :loading="loading" @click="handleGetContent">
          <template #icon><DownloadOutlined /></template>
          获取编辑器内容
        </AButton>
        <AButton :disabled="!inputContent" @click="handleConvertToMarkdown">
          <template #icon><SwapOutlined /></template>
          转为 MD
        </AButton>
        <AButton @click="handleCopyInput">
          <template #icon><CopyOutlined /></template>
          复制 HTML
        </AButton>
        <AButton @click="handleCopyOutput">
          <template #icon><CopyOutlined /></template>
          复制 MD
        </AButton>
      </div>

      <!-- 双栏编辑区域 -->
      <div class="editor-panels">
        <!-- 左侧：原始内容 -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">原始 HTML 内容</span>
            <span class="content-length">{{ inputContent.length }} 字符</span>
          </div>
          <ATextarea
            v-model:value="inputContent"
            placeholder="点击「获取编辑器内容」按钮获取当前微信编辑器的富文本内容"
            :autoSize="{ minRows: 20, maxRows: 30 }"
            class="code-textarea"
          />
        </div>

        <!-- 右侧：Markdown 内容 -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Markdown 内容</span>
            <span class="content-length">{{ outputContent.length }} 字符</span>
          </div>
          <ATextarea
            v-model:value="outputContent"
            placeholder="点击「转为 MD」将 HTML 转换为 Markdown 格式"
            :autoSize="{ minRows: 20, maxRows: 30 }"
            class="code-textarea"
          />
        </div>
      </div>

      <!-- 预览区域 -->
      <div class="preview-section">
        <ACollapse v-model:activeKey="previewActiveKey">
          <ACollapsePanel key="preview" header="原始 HTML 预览">
            <div class="preview-content" v-html="inputContent"></div>
          </ACollapsePanel>
        </ACollapse>
      </div>
    </div>
  </AModal>
</template>

<script setup>
import { ref, inject, watch } from 'vue'
import { 
  Modal as AModal, 
  Button as AButton, 
  Input as AInput, 
  Collapse as ACollapse,
  message 
} from 'ant-design-vue'
import { 
  DownloadOutlined, 
  CopyOutlined,
  SwapOutlined
} from '@ant-design/icons-vue'
import { getEditorContent } from '../services/wechat-editor.js'
import { htmlToMarkdown } from '@/utils/html-to-markdown.js'

const ATextarea = AInput.TextArea
const ACollapsePanel = ACollapse.Panel

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open'])

// 控制弹窗显示
const visible = ref(false)

// 同步 props.open 和内部状态
watch(() => props.open, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:open', val)
})

// 注入获取webview的方法
const getActiveWebview = inject('getActiveWebview')

// 状态
const loading = ref(false)
const inputContent = ref('')
const outputContent = ref('')
const previewActiveKey = ref([])

// 获取编辑器内容
const handleGetContent = async () => {
  const webview = getActiveWebview()
  if (!webview) {
    message.warning('请先打开一个微信编辑器标签页')
    return
  }

  loading.value = true
  try {
    const content = await getEditorContent(webview)
    if (content) {
      inputContent.value = content
      outputContent.value = '' // 清空 MD 区域
      message.success('已获取编辑器内容')
    } else {
      message.warning('未获取到编辑器内容，请确保已打开微信编辑页面')
    }
  } catch (error) {
    console.error('获取编辑器内容失败:', error)
    message.error('获取内容失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 将 HTML 转换为 Markdown
const handleConvertToMarkdown = () => {
  if (!inputContent.value) {
    message.warning('没有内容可转换')
    return
  }
  
  try {
    outputContent.value = htmlToMarkdown(inputContent.value)
    message.success('已转换为 Markdown')
  } catch (error) {
    console.error('转换失败:', error)
    message.error('转换失败: ' + error.message)
  }
}

// 复制 HTML 内容
const handleCopyInput = async () => {
  if (!inputContent.value) {
    message.warning('没有 HTML 内容可复制')
    return
  }
  try {
    await navigator.clipboard.writeText(inputContent.value)
    message.success('已复制 HTML 内容')
  } catch (error) {
    message.error('复制失败')
  }
}

// 复制 Markdown 内容
const handleCopyOutput = async () => {
  if (!outputContent.value) {
    message.warning('没有 Markdown 内容可复制，请先点击「转为 MD」')
    return
  }
  try {
    await navigator.clipboard.writeText(outputContent.value)
    message.success('已复制 Markdown 内容')
  } catch (error) {
    message.error('复制失败')
  }
}
</script>

<style scoped lang="scss">
.debug-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.editor-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-weight: 500;
  color: #333;
}

.content-length {
  font-size: 12px;
  color: #999;
}

.code-textarea {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  
  :deep(textarea) {
    background: #fafafa;
    border-radius: 6px;
  }
}

.preview-section {
  margin-top: 8px;
}

.preview-content {
  padding: 12px;
  max-height: 400px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  
  // 微信文章样式适配
  :deep(img) {
    max-width: 100%;
    height: auto;
  }
  
  :deep(p) {
    margin: 0.5em 0;
  }
  
  :deep(section) {
    margin: 0.5em 0;
  }
}
</style>

<style>
/* 全局样式，设置弹窗最大高度 */
.ai-layout-debug-modal .ant-modal-body {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}
</style>
