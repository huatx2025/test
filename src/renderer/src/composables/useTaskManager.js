import { ref } from 'vue'

// 全局任务列表
const taskList = ref([])
let taskIdCounter = 0

// 任务中心弹窗显示状态
const taskPopoverVisible = ref(false)

/**
 * 全局任务管理器
 * 用于管理批量删除、同步、发文等长时任务
 */
export function useTaskManager() {
  /**
   * 创建一个新任务
   * @param {string} name - 任务名称
   * @param {number} total - 任务总数
   * @param {string} type - 任务类型 (delete, sync, publish 等)
   * @param {string} detail - 任务详细描述（可选）
   * @returns {object} - 任务对象
   */
  const createTask = (name, total, type = 'default', detail = '') => {
    const task = {
      id: ++taskIdCounter,
      name,
      type,
      status: 'pending', // pending, running, completed, failed, paused, cancelled
      current: 0,
      total,
      progress: 0,
      detail, // 任务详细描述
      errorMsg: '',
      createdAt: Date.now(),
      cancelFlag: false, // 中止标志
      pauseFlag: false, // 暂停标志
      currentRequestId: null // 当前正在执行的请求ID
    }
    
    taskList.value.push(task)
    return task
  }

  /**
   * 更新任务进度
   * @param {number} taskId - 任务ID
   * @param {number} current - 当前进度
   * @param {string} status - 任务状态
   * @param {string} detail - 任务详细描述（可选）
   */
  const updateTask = (taskId, current, status = 'running', detail = null) => {
    const task = taskList.value.find(t => t.id === taskId)
    if (task) {
      task.current = current
      task.status = status
      task.progress = Math.round((current / task.total) * 100)
      if (detail !== null) {
        task.detail = detail
      }
    }
  }

  /**
   * 标记任务完成
   * @param {number} taskId - 任务ID
   */
  const completeTask = (taskId) => {
    const task = taskList.value.find(t => t.id === taskId)
    if (task) {
      task.status = 'completed'
      task.current = task.total
      task.progress = 100
    }
  }

  /**
   * 标记任务失败
   * @param {number} taskId - 任务ID
   * @param {string} errorMsg - 错误信息
   */
  const failTask = (taskId, errorMsg = '任务失败') => {
    const task = taskList.value.find(t => t.id === taskId)
    if (task) {
      task.status = 'failed'
      task.errorMsg = errorMsg
    }
  }

  /**
   * 移除任务
   * @param {number} taskId - 任务ID
   */
  const removeTask = (taskId) => {
    const index = taskList.value.findIndex(t => t.id === taskId)
    if (index !== -1) {
      taskList.value.splice(index, 1)
    }
  }

  /**
   * 清空已完成的任务
   */
  const clearCompleted = () => {
    taskList.value = taskList.value.filter(
      task => task.status !== 'completed'
    )
  }

  /**
   * 获取任务
   * @param {number} taskId - 任务ID
   * @returns {object|undefined} - 任务对象
   */
  const getTask = (taskId) => {
    return taskList.value.find(t => t.id === taskId)
  }

  /**
   * 暂停任务
   * @param {number} taskId - 任务ID
   */
  const pauseTask = (taskId) => {
    const task = taskList.value.find(t => t.id === taskId)
    if (task && task.status === 'running') {
      task.status = 'paused'
      task.pauseFlag = true
      
      // 如果有正在进行的请求，中止它
      if (task.currentRequestId && window.electronAPI?.http?.abort) {
        window.electronAPI.http.abort(task.currentRequestId)
        task.currentRequestId = null
      }
    }
  }

  /**
   * 恢复任务
   * @param {number} taskId - 任务ID
   */
  const resumeTask = (taskId) => {
    const task = taskList.value.find(t => t.id === taskId)
    if (task && task.status === 'paused') {
      task.status = 'running'
      task.pauseFlag = false
    }
  }

  /**
   * 中止任务
   * @param {number} taskId - 任务ID
   */
  const cancelTask = (taskId) => {
    const task = taskList.value.find(t => t.id === taskId)
    if (task && (task.status === 'running' || task.status === 'paused')) {
      task.status = 'cancelled'
      task.cancelFlag = true
      
      // 如果有正在进行的请求，中止它
      if (task.currentRequestId && window.electronAPI?.http?.abort) {
        window.electronAPI.http.abort(task.currentRequestId)
        task.currentRequestId = null
      }
    }
  }

  /**
   * 设置任务当前请求ID
   * @param {number} taskId - 任务ID
   * @param {string|null} requestId - 请求ID
   */
  const setTaskRequestId = (taskId, requestId) => {
    const task = taskList.value.find(t => t.id === taskId)
    if (task) {
      task.currentRequestId = requestId
    }
  }

  /**
   * 检查任务是否被暂停
   * @param {number} taskId - 任务ID
   * @returns {boolean}
   */
  const isTaskPaused = (taskId) => {
    const task = taskList.value.find(t => t.id === taskId)
    return task ? task.pauseFlag : false
  }

  /**
   * 检查任务是否被中止
   * @param {number} taskId - 任务ID
   * @returns {boolean}
   */
  const isTaskCancelled = (taskId) => {
    const task = taskList.value.find(t => t.id === taskId)
    return task ? task.cancelFlag : false
  }

  /**
   * 打开任务中心弹窗
   */
  const showTaskPopover = () => {
    taskPopoverVisible.value = true
  }

  /**
   * 关闭任务中心弹窗
   */
  const hideTaskPopover = () => {
    taskPopoverVisible.value = false
  }

  return {
    taskList,
    taskPopoverVisible,
    createTask,
    updateTask,
    completeTask,
    failTask,
    removeTask,
    clearCompleted,
    getTask,
    pauseTask,
    resumeTask,
    cancelTask,
    isTaskPaused,
    isTaskCancelled,
    setTaskRequestId,
    showTaskPopover,
    hideTaskPopover
  }
}

