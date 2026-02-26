<template>
  <APopover
    v-model:open="popoverVisible"
    placement="bottomRight"
    trigger="click"
    overlayClassName="task-popover"
    :arrow="false"
    :getPopupContainer="trigger => trigger.parentElement"
  >
    <template #content>
      <div class="task-popover-content">
        <!-- 头部 -->
        <div class="task-header">
          <div class="task-header-left">
            <span class="task-title">任务中心</span>
            <span class="task-count">({{ taskList.length }})</span>
          </div>
          <div class="task-header-right">
            <!-- <AButton type="text" size="small" @click="handleAddTestTasks">
              测试
            </AButton> -->
            <AButton type="text" size="small" @click="handleClearCompleted">
              清空已完成
            </AButton>
          </div>
        </div>

        <!-- 任务列表 -->
        <div class="task-list">
          <div v-if="taskList.length === 0" class="empty-task">
            <AEmpty description="暂无任务" :image="simpleImage" />
          </div>
          <div
            v-for="task in taskList"
            :key="task.id"
            class="task-item"
            :class="{ 
              'task-completed': task.status === 'completed', 
              'task-failed': task.status === 'failed',
              'task-paused': task.status === 'paused',
              'task-cancelled': task.status === 'cancelled'
            }"
          >
            <!-- 任务图标 -->
            <div class="task-icon">
              <LoadingOutlined v-if="task.status === 'running'" spin />
              <CheckCircleOutlined v-else-if="task.status === 'completed'" />
              <CloseCircleOutlined v-else-if="task.status === 'failed'" />
              <PauseCircleOutlined v-else-if="task.status === 'paused'" />
              <StopOutlined v-else-if="task.status === 'cancelled'" />
              <ClockCircleOutlined v-else />
            </div>

            <!-- 任务信息 -->
            <div class="task-info">
              <div class="task-name">{{ task.name }}</div>
              <div class="task-detail">
                <span v-if="task.detail || task.status === 'paused' || task.status === 'cancelled' || task.status === 'failed'" class="task-description">
                  <span v-if="task.status === 'paused'" class="paused-text">已暂停 </span>
                  <span v-else-if="task.status === 'cancelled'" class="cancelled-text">已中止 </span>
                  <span v-else-if="task.status === 'failed'" class="error-text">{{ task.errorMsg }} </span>
                  <span>{{ task.detail || '' }}</span>
                </span>
                <span class="task-progress-text">{{ task.current }}/{{ task.total }}</span>
              </div>
              <!-- 任务进度条 -->
              <AProgress
                v-if="task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled'"
                :percent="task.progress"
                :show-info="false"
                size="small"
                :stroke-color="getTaskProgressColor(task.status)"
              />
            </div>

            <!-- 操作按钮 -->
            <div class="task-actions">
              <!-- 运行中：显示暂停和中止 -->
              <AButton
                v-if="task.status === 'running'"
                type="text"
                size="small"
                @click="handlePause(task)"
                title="暂停"
              >
                <template #icon>
                  <PauseOutlined />
                </template>
              </AButton>
              <AButton
                v-if="task.status === 'running'"
                type="text"
                size="small"
                danger
                @click="handleCancel(task)"
                title="中止"
              >
                <template #icon>
                  <CloseOutlined />
                </template>
              </AButton>
              
              <!-- 暂停中：显示恢复和中止 -->
              <AButton
                v-if="task.status === 'paused'"
                type="text"
                size="small"
                @click="handleResume(task)"
                title="恢复"
              >
                <template #icon>
                  <CaretRightOutlined />
                </template>
              </AButton>
              <AButton
                v-if="task.status === 'paused'"
                type="text"
                size="small"
                danger
                @click="handleCancel(task)"
                title="中止"
              >
                <template #icon>
                  <CloseOutlined />
                </template>
              </AButton>
              
              <!-- 失败：显示重试 -->
              <!-- <AButton
                v-if="task.status === 'failed'"
                type="text"
                size="small"
                @click="handleRetry(task)"
              >
                重试
              </AButton> -->
              
              <!-- 已完成、已失败、已中止：显示移除 -->
              <AButton
                v-if="task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled'"
                type="text"
                size="small"
                danger
                @click="handleRemove(task)"
              >
                移除
              </AButton>
            </div>
          </div>
        </div>
      </div>
    </template>

    <ABadge :count="runningCount" :overflow-count="99">
      <div class="default-trigger">
        <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3464" width="18" height="18" fill="#000"><path d="M448 896H163.04C143.904 896 128 879.68 128 859.072V164.928C128 144.32 143.904 128 163.04 128h569.92C752.096 128 768 144.32 768 164.928v182.464a32 32 0 0 0 64 0V164.928C832 109.376 787.84 64 732.96 64H163.04C108.16 64 64 109.376 64 164.928v694.144C64 914.624 108.16 960 163.04 960H448a32 32 0 0 0 0-64z" p-id="3465"></path><path d="M736 448a256 256 0 1 0 0 512 256 256 0 0 0 0-512z m0 448a192 192 0 1 1 0-384 192 192 0 0 1 0 384z" p-id="3466"></path><path d="M831.456 688H752v-64a32 32 0 0 0-64 0v96a32 32 0 0 0 32 32h111.456a32 32 0 0 0 0-64zM640 320a32 32 0 0 0-32-32H288a32 32 0 0 0 0 64h320a32 32 0 0 0 32-32zM288 544a32 32 0 0 0 0 64h80.288a32 32 0 0 0 0-64H288z" p-id="3467"></path></svg>
      </div>
    </ABadge>
  </APopover>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { 
  Popover as APopover, 
  Progress as AProgress, 
  Button as AButton,
  Badge as ABadge,
  Empty as AEmpty
} from 'ant-design-vue'
import {
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  PauseOutlined,
  CaretRightOutlined,
  CloseOutlined
} from '@ant-design/icons-vue'
import { Empty } from 'ant-design-vue'
import { useTaskManager } from '@/composables/useTaskManager'

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE

const props = defineProps({
  // 任务列表
  // 每个任务的格式：
  // {
  //   id: string | number,
  //   name: string,
  //   status: 'pending' | 'running' | 'completed' | 'failed',
  //   current: number,
  //   total: number,
  //   progress: number, // 0-100
  //   errorMsg?: string
  // }
  tasks: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([/* 'retry', */ 'remove', 'clearCompleted', 'pause', 'resume', 'cancel'])

// 使用全局任务管理器的弹窗状态
const { taskPopoverVisible } = useTaskManager()
const popoverVisible = taskPopoverVisible

// 监听 popover 显示状态变化（用于调试）
watch(() => popoverVisible.value, (newVal) => {
  console.log('TaskPopover visible:', newVal)
})

// 任务列表 - 按创建时间降序排序，最新的在最上面
const taskList = computed(() => {
  return [...props.tasks].sort((a, b) => {
    const timeA = a.createdAt || 0
    const timeB = b.createdAt || 0
    return timeB - timeA // 降序排序，最新的在最上面
  })
})

// 监听任务列表变化（用于调试）
watch(() => taskList.value, (newVal) => {
  console.log('TaskList changed:', newVal)
}, { immediate: true, deep: true })

// 运行中的任务数量
const runningCount = computed(() => {
  return taskList.value.filter(task => task.status === 'running').length
})

// 获取任务进度条颜色
const getTaskProgressColor = (status) => {
  switch (status) {
    case 'running':
      return '#1677ff'
    case 'completed':
      return '#52c41a'
    case 'failed':
      return '#ff4d4f'
    case 'paused':
      return '#faad14'
    case 'cancelled':
      return '#8c8c8c'
    default:
      return '#d9d9d9'
  }
}

// 重试任务
// const handleRetry = (task) => {
//   emit('retry', task)
// }

// 移除任务
const handleRemove = (task) => {
  emit('remove', task)
}

// 清空已完成
const handleClearCompleted = () => {
  emit('clearCompleted')
}

// 暂停任务
const handlePause = (task) => {
  emit('pause', task)
}

// 恢复任务
const handleResume = (task) => {
  emit('resume', task)
}

// 中止任务
const handleCancel = (task) => {
  emit('cancel', task)
}

// 添加测试任务
const { createTask, updateTask, completeTask, failTask } = useTaskManager()
const handleAddTestTasks = () => {
  // 1. 运行中的任务 (50%)
  const runningTask = createTask('批量删除草稿', 100, 'delete', '正在删除草稿《如何提升产品用户体验》')
  updateTask(runningTask.id, 50, 'running')

  // 2. 运行中的任务 (80%)
  const runningTask2 = createTask('批量同步文章', 200, 'sync', '正在同步文章《深入理解Vue3响应式原理》')
  updateTask(runningTask2.id, 160, 'running')

  // 3. 已完成的任务
  const completedTask = createTask('批量发布文章', 50, 'publish', '已完成发布《前端性能优化最佳实践》')
  completeTask(completedTask.id)

  // 4. 失败的任务
  const failedTask = createTask('批量上传图片', 30, 'upload', '正在上传图片 banner-001.jpg')
  updateTask(failedTask.id, 15, 'running')
  failTask(failedTask.id, '网络连接失败')

  // 5. 暂停的任务
  const pausedTask = createTask('批量导入文档', 150, 'import', '正在导入文档《技术架构设计文档.docx》')
  updateTask(pausedTask.id, 75, 'paused')

  // 6. 中止的任务
  const cancelledTask = createTask('批量下载资源', 80, 'download', '正在下载资源 video-tutorial-03.mp4')
  updateTask(cancelledTask.id, 40, 'cancelled')

  // 7. 待处理的任务
  createTask('批量转换格式', 60, 'convert', '等待转换《年度总结报告.pdf》')
}
</script>

<style scoped lang="scss">
:deep(.ant-badge) {
  -webkit-app-region: no-drag;
}

.default-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #6b7280;
  border-radius: 6px;
  transition: all 0.2s;
  cursor: pointer;
  -webkit-app-region: no-drag;

  &:hover {
    background: #f3f4f6;
    color: #1f2937;
  }
}
</style>

<style lang="scss">
.task-popover {
  .ant-popover-inner {
    padding: 0;
    border-radius: 8px;
    box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08),
                0 3px 6px -4px rgba(0, 0, 0, 0.12),
                0 9px 28px 8px rgba(0, 0, 0, 0.05);
  }

  .ant-popover-inner-content {
    padding: 0;
  }

  .ant-progress-line {
    margin-bottom: 0 !important;
  }
}

.task-popover-content {
  width: 420px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.task-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.task-count {
  font-size: 14px;
  color: #6b7280;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.empty-task {
  padding: 40px 0;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;

  &:hover {
    background: #fafafa;
  }

  &:last-child {
    border-bottom: none;
  }

  &.task-completed {
    opacity: 0.7;
  }

  &.task-failed {
    background: #fff2f0;
  }

  &.task-paused {
    opacity: 0.8;
  }

  &.task-cancelled {
    opacity: 0.6;
  }
}

.task-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;

  .anticon-loading {
    color: #1677ff;
  }

  .anticon-check-circle {
    color: #52c41a;
  }

  .anticon-close-circle {
    color: #ff4d4f;
  }

  .anticon-clock-circle {
    color: #d9d9d9;
  }

  .anticon-pause-circle {
    color: #faad14;
  }

  .anticon-stop {
    color: #8c8c8c;
  }
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.task-description {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #4b5563;
}

.task-progress-text {
  flex-shrink: 0;
  color: #9ca3af;
  font-size: 11px;
}

.error-text {
  color: #ff4d4f;
}

.paused-text {
  color: #faad14;
}

.cancelled-text {
  color: #8c8c8c;
}

.task-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>

