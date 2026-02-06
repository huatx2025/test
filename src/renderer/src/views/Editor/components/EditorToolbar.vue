<template>
  <div class="editor-toolbar">
    <div class="toolbar-header">工具箱</div>
    <div class="toolbar-grid">
      <div
        v-for="tool in tools"
        :key="tool.key"
        class="tool-item"
        @click="handleToolClick(tool)"
      >
        <div class="tool-icon">
          <component :is="tool.icon" />
        </div>
        <div class="tool-name">{{ tool.name }}</div>
        <span v-if="tool.tag" class="tool-tag">{{ tool.tag }}</span>
      </div>
    </div>

    <!-- 导入文章对话框 -->
    <AModal
      v-model:open="importModalVisible"
      title="导入文章"
      :confirm-loading="importLoading"
      ok-text="导入"
      cancel-text="取消"
      centered
      @ok="handleImportConfirm"
      @cancel="handleImportCancel"
    >
      <div class="import-dialog-content">
        <div class="import-url-list">
          <div
            v-for="(item, index) in importUrls"
            :key="index"
            class="import-url-item"
          >
            <AInput
              :ref="index === 0 ? (el) => firstInputRef = el : undefined"
              v-model:value="importUrls[index].url"
              placeholder="微信公众号文章链接地址（以 https://mp.weixin.qq.com/s 开头）"
              :status="item.error ? 'error' : ''"
              size="large"
              @focus="importUrls[index].error = false"
              @pressEnter="handleImportConfirm"
            />
            <AButton
              v-if="importUrls.length > 1"
              type="text"
              danger
              class="remove-url-btn"
              @click="removeUrlInput(index)"
            >
              <MinusCircleOutlined />
            </AButton>
          </div>
        </div>
        <AButton
          v-if="importUrls.length < MAX_IMPORT_COUNT && !importAdvancedOptions.includes('expandAll')"
          type="dashed"
          block
          class="add-url-btn"
          @click="addUrlInput"
        >
          <PlusOutlined /> 添加文章链接（{{ importUrls.length }}/{{ MAX_IMPORT_COUNT }}）
        </AButton>
        <div class="import-advanced-settings">
          <span class="advanced-settings-title">高级设置：</span>
          <ACheckboxGroup v-model:value="importAdvancedOptions" :options="advancedOptionsConfig" />
        </div>
      </div>
    </AModal>

    <!-- 内容覆盖确认对话框 -->
    <AModal
      v-model:open="contentConfirmVisible"
      title="检测到编辑器已有内容"
      :footer="null"
    >
      <p>是否要覆盖当前内容，还是创建新的文章？</p>
      <div class="content-confirm-actions">
        <AButton @click="handleContentConfirmCreateNew">创建新文章</AButton>
        <AButton type="primary" @click="handleContentConfirmOverwrite">覆盖内容</AButton>
      </div>
    </AModal>

    <!-- AI 排版调试弹窗 -->
    <AILayoutDebugModal v-model:open="aiLayoutModalVisible" />
  </div>
</template>

<script setup>
import { ref, inject, nextTick, watch } from 'vue'
import { Modal as AModal, Input as AInput, Button as AButton, Checkbox as ACheckbox, message } from 'ant-design-vue'

const ACheckboxGroup = ACheckbox.Group
import {
  ImportOutlined,
  LayoutOutlined,
  PlusOutlined,
  MinusCircleOutlined
} from '@ant-design/icons-vue'
import {
  parseArticleData,
  fillArticleToEditor,
  checkEditorHasContent,
  createNewArticleAndFill
} from '../services/wechat-editor.js'
import AILayoutDebugModal from './AILayoutDebugModal.vue'

// 注入获取webview的方法
const getActiveWebview = inject('getActiveWebview')

// 工具列表
const tools = [
  { key: 'import-article', name: '导入文章', icon: ImportOutlined },
  { key: 'ai-layout', name: 'AI排版', icon: LayoutOutlined , tag: '新' },
]

// ========== 导入文章相关状态 ==========
const importModalVisible = ref(false)
const importLoading = ref(false)
const importUrls = ref([{ url: '', error: false }])
const MAX_IMPORT_COUNT = 8 // 最多支持8篇文章
const firstInputRef = ref(null)
const manualInputCount = ref(1) // 记录用户手动添加的输入框数量

// 高级设置选项
const importAdvancedOptions = ref(['clearSourceUrl'])
const advancedOptionsConfig = [
  { label: '清除原文链接', value: 'clearSourceUrl' },
  { label: '一次展开8个链接', value: 'expandAll' }
]

// 内容覆盖确认对话框
const contentConfirmVisible = ref(false)
const pendingArticleData = ref(null)
const pendingUrls = ref([]) // 保存待处理的剩余文章URLs

// AI排版调试弹窗
const aiLayoutModalVisible = ref(false)

// 添加链接输入框
const addUrlInput = () => {
  if (importUrls.value.length >= MAX_IMPORT_COUNT) {
    message.warning(`最多支持导入 ${MAX_IMPORT_COUNT} 篇文章`)
    return
  }
  importUrls.value.push({ url: '', error: false })
  // 只在非展开模式下更新手动计数
  if (!importAdvancedOptions.value.includes('expandAll')) {
    manualInputCount.value = importUrls.value.length
  }
}

// 移除链接输入框
const removeUrlInput = (index) => {
  importUrls.value.splice(index, 1)
  // 只在非展开模式下更新手动计数
  if (!importAdvancedOptions.value.includes('expandAll')) {
    manualInputCount.value = importUrls.value.length
  }
}

// 监听高级设置变化，处理一次展开8个链接的切换
watch(importAdvancedOptions, (newVal, oldVal) => {
  const expandAllEnabled = newVal.includes('expandAll')
  const wasExpandAllEnabled = oldVal.includes('expandAll')

  // 从未启用切换到启用：展开到8个
  if (expandAllEnabled && !wasExpandAllEnabled) {
    const currentCount = importUrls.value.length
    if (currentCount < MAX_IMPORT_COUNT) {
      // 保留已有的URL，补充到8个
      const existingUrls = [...importUrls.value]
      importUrls.value = Array(MAX_IMPORT_COUNT).fill(null).map((_, i) => {
        return existingUrls[i] || { url: '', error: false }
      })
    }
  }
  // 从启用切换到未启用：恢复到手动添加的数量
  else if (!expandAllEnabled && wasExpandAllEnabled) {
    const targetCount = Math.min(manualInputCount.value, importUrls.value.length)
    if (targetCount < importUrls.value.length) {
      importUrls.value = importUrls.value.slice(0, targetCount)
    }
  }
}, { deep: true })

// 打开导入对话框
const openImportDialog = () => {
  const webview = getActiveWebview()
  if (!webview) {
    message.warning('请先打开一个编辑器标签页')
    return
  }

  // 检查是否启用一次展开8个链接
  const expandAll = importAdvancedOptions.value.includes('expandAll')

  if (expandAll) {
    // 一次展开8个链接
    importUrls.value = Array(MAX_IMPORT_COUNT).fill(null).map(() => ({ url: '', error: false }))
    manualInputCount.value = MAX_IMPORT_COUNT
  } else {
    // 默认只显示1个输入框
    importUrls.value = [{ url: '', error: false }]
    manualInputCount.value = 1
  }

  importModalVisible.value = true

  // 弹窗打开后自动聚焦第一个输入框
  nextTick(() => {
    setTimeout(() => {
      if (firstInputRef.value) {
        firstInputRef.value.focus()
      }
    }, 100)
  })
}

// 确认导入
const handleImportConfirm = async () => {
  // 过滤出有效的URL
  const validUrls = []
  let hasError = false

  for (let i = 0; i < importUrls.value.length; i++) {
    const url = importUrls.value[i].url.trim()
    if (!url) {
      importUrls.value[i].error = true
      hasError = true
      continue
    }
    if (!url.startsWith('https://mp.weixin.qq.com/s')) {
      importUrls.value[i].error = true
      hasError = true
      continue
    }
    validUrls.push(url)
  }

  if (hasError && validUrls.length === 0) {
    message.error('请输入有效的微信公众号文章链接')
    return
  }

  const webview = getActiveWebview()
  if (!webview) {
    message.error('未找到编辑器')
    return
  }

  importLoading.value = true

  try {
    // 批量导入：逐个处理
    for (let i = 0; i < validUrls.length; i++) {
      const url = validUrls[i]
      console.log('%c开始提取文章链接:', 'color: #6666FF;', url)

      // 通过IPC调用主进程提取文章
      const result = await window.electronAPI.article.extract(url)

      if (result.code !== 0) {
        message.error(`第${i + 1}篇文章导入失败: ${result.message}`)
        continue
      }

      console.log('%c接收到原始文章数据:', 'color: #6666FF;', result.data)

      // 解析文章数据，传入高级设置选项
      const articleData = parseArticleData(result.data, {
        clearSourceUrl: importAdvancedOptions.value.includes('clearSourceUrl')
      })
      console.log('%c处理后的文章数据:', 'color: #6666FF;', articleData)

      // 第一篇文章检测是否有内容
      if (i === 0) {
        const hasContent = await checkEditorHasContent(webview)

        if (hasContent) {
          // 保存待处理的文章数据和剩余的URLs，显示确认对话框
          pendingArticleData.value = articleData
          pendingUrls.value = validUrls.slice(1) // 保存剩余的URLs（从第二篇开始）
          importModalVisible.value = false
          contentConfirmVisible.value = true
          return
        } else {
          // 直接填充第一篇
          await fillArticleToEditor(webview, articleData)
        }
      } else {
        // 后续文章都创建新文章
        await createNewArticleAndFill(webview, articleData)
      }
    }

    importModalVisible.value = false
    message.success(`成功导入 ${validUrls.length} 篇文章`)

    // 导入成功后重置输入框数量
    const targetCount = Math.min(manualInputCount.value, MAX_IMPORT_COUNT)
    importUrls.value = Array(targetCount).fill(null).map(() => ({ url: '', error: false }))
  } catch (error) {
    console.error('导入失败:', error)
    message.error(`导入失败: ${error.message}`)
  } finally {
    importLoading.value = false
  }
}

// 取消导入
const handleImportCancel = () => {
  importModalVisible.value = false
  // 恢复到手动添加的数量
  const targetCount = Math.min(manualInputCount.value, MAX_IMPORT_COUNT)
  importUrls.value = Array(targetCount).fill(null).map(() => ({ url: '', error: false }))
}

// 选择覆盖内容
const handleContentConfirmOverwrite = async () => {
  contentConfirmVisible.value = false
  const webview = getActiveWebview()
  if (webview && pendingArticleData.value) {
    try {
      // 填充第一篇文章（覆盖当前内容）
      await fillArticleToEditor(webview, pendingArticleData.value)

      // 继续处理剩余的文章
      const remainingSuccess = await processRemainingUrls(webview)

      const totalCount = 1 + remainingSuccess
      message.success(`成功导入 ${totalCount} 篇文章`)
    } catch (error) {
      message.error(`填充失败: ${error.message}`)
    }
  }
  pendingArticleData.value = null
  pendingUrls.value = []
}

// 选择创建新文章
const handleContentConfirmCreateNew = async () => {
  contentConfirmVisible.value = false
  const webview = getActiveWebview()
  if (webview && pendingArticleData.value) {
    try {
      // 创建新文章并填充第一篇
      await createNewArticleAndFill(webview, pendingArticleData.value)

      // 继续处理剩余的文章
      const remainingSuccess = await processRemainingUrls(webview)

      const totalCount = 1 + remainingSuccess
      message.success(`成功导入 ${totalCount} 篇文章`)
    } catch (error) {
      message.error(`创建失败: ${error.message}`)
    }
  }
  pendingArticleData.value = null
  pendingUrls.value = []
}

// 处理剩余的文章URLs（在用户确认覆盖或创建新文章后调用）
// 返回成功导入的文章数量
const processRemainingUrls = async (webview) => {
  const urls = pendingUrls.value
  if (!urls || urls.length === 0) return 0

  let successCount = 0
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    console.log('%c处理剩余文章:', 'color: #6666FF;', url)

    try {
      // 通过IPC调用主进程提取文章
      const result = await window.electronAPI.article.extract(url)

      if (result.code !== 0) {
        message.error(`第${i + 2}篇文章导入失败: ${result.message}`)
        continue
      }

      // 解析文章数据
      const articleData = parseArticleData(result.data, {
        clearSourceUrl: importAdvancedOptions.value.includes('clearSourceUrl')
      })

      // 剩余文章都创建新文章
      await createNewArticleAndFill(webview, articleData)
      successCount++
    } catch (error) {
      console.error(`第${i + 2}篇文章处理失败:`, error)
      message.error(`第${i + 2}篇文章处理失败: ${error.message}`)
    }
  }
  return successCount
}

// 打开 AI 排版调试弹窗
const openAILayoutDialog = () => {
  const webview = getActiveWebview()
  if (!webview) {
    message.warning('请先打开一个编辑器标签页')
    return
  }
  aiLayoutModalVisible.value = true
}

// 点击工具
const handleToolClick = (tool) => {
  console.log('点击工具:', tool.key)

  switch (tool.key) {
    case 'import-article':
      openImportDialog()
      break
    case 'ai-layout':
      openAILayoutDialog()
      break
    default:
      // TODO: 实现其他工具功能
      break
  }
}
</script>

<style scoped lang="scss">
.editor-toolbar {
  width: 100%;
  height: 100%;
  padding: 16px 12px;
  box-sizing: border-box;
  overflow-y: auto;
}

.toolbar-header {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 16px;
  padding-left: 4px;
}

.toolbar-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: transparent;

  &:hover {
    background: #f5f5f5;
  }

  &:active {
    background: #ebebeb;
  }
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-bottom: 6px;
  color: #666;
  font-size: 22px;
}

.tool-name {
  font-size: 12px;
  color: #333;
  text-align: center;
  line-height: 1.4;
}

.tool-tag {
  position: absolute;
  top: 4px;
  right: 8px;
  padding: 1px 4px;
  font-size: 10px;
  color: #ff4d4f;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  line-height: 1.2;
}

// 导入对话框样式
.import-dialog-content {
  padding: 8px 0;
  min-height: 300px;
}

.import-url-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.import-url-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.import-url-item :deep(.ant-input) {
  flex: 1;
}

.remove-url-btn {
  flex-shrink: 0;
  padding: 4px 8px;
}

.add-url-btn {
  margin-top: 12px;
}

.import-advanced-settings {
  padding-top: 16px;
  margin-top: 8px;
}

.advanced-settings-title {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

// 内容确认对话框样式
.content-confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>

