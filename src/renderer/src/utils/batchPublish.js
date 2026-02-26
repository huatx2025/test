/**
 * 批量发布相关工具函数
 * 
 * 注意：草稿同步使用 @/utils/wechat/appmsg.js 中的 createSyncWechatDraftTask
 * 本文件提供批量发布特有的功能：
 * - 带 appmsgid 返回的同步（用于后续发布）
 * - 批量获取群发信息
 * - 批量发布任务
 */

import { useTaskManager } from '@/composables/useTaskManager'
import { 
  operateWechatDraft, 
  getMasssendInfo, 
  publishAppmsg
} from '@/.thidparty_api/wechat'

// 复用现有的参数转换函数
import { convertAppMsgInfoToParams } from '@/utils/wechat'

/**
 * 延时函数
 * @param {number} ms - 毫秒
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 同步草稿到目标账号（返回 appmsgid，用于后续发布）
 * 
 * 注意：如果只需要同步草稿不需要发布，建议使用 createSyncWechatDraftTask
 * 本函数专门用于批量发布流程，会返回同步后的 appmsgid
 * 
 * @param {Object} draftDetail - 草稿详情（app_msg_info）
 * @param {Object} targetAccount - 目标账号
 * @returns {Promise<Object>} 同步结果，包含 appmsgid
 */
export async function syncDraftToAccount(draftDetail, targetAccount) {
  try {
    const params = convertAppMsgInfoToParams(draftDetail)
    const result = await operateWechatDraft(targetAccount.id, 'create', params)
    
    return {
      success: true,
      accountId: targetAccount.id,
      appmsgid: result.appmsgid
    }
  } catch (error) {
    return {
      success: false,
      accountId: targetAccount.id,
      error: error.message
    }
  }
}

/**
 * 批量同步草稿到多个账号
 * @param {Object} draftDetail - 草稿详情
 * @param {Array} targetAccounts - 目标账号列表
 * @param {Object} options - 配置选项
 * @param {Function} options.onProgress - 进度回调
 * @param {number} options.delayMs - 每个账号之间的延迟（毫秒）
 * @returns {Promise<Array>} 同步结果数组
 */
export async function syncDraftToAccounts(draftDetail, targetAccounts, options = {}) {
  const { onProgress, delayMs = 1000 } = options
  const results = []
  
  for (let i = 0; i < targetAccounts.length; i++) {
    const account = targetAccounts[i]
    
    if (onProgress) {
      onProgress({
        current: i,
        total: targetAccounts.length,
        account,
        status: 'syncing'
      })
    }
    
    const result = await syncDraftToAccount(draftDetail, account)
    results.push(result)
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: targetAccounts.length,
        account,
        status: result.success ? 'synced' : 'failed',
        result
      })
    }
    
    // 延迟
    if (i < targetAccounts.length - 1 && delayMs > 0) {
      await sleep(delayMs)
    }
  }
  
  return results
}

/**
 * 批量获取群发信息
 * @param {Array} accounts - 账号列表（需包含 syncedAppmsgid）
 * @param {Object} options - 配置选项
 * @returns {Promise<Array>} 检测结果数组
 */
export async function batchGetMasssendInfo(accounts, options = {}) {
  const { onProgress, delayMs = 500 } = options
  const results = []
  
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]
    
    if (!account.syncedAppmsgid) {
      results.push({
        success: false,
        accountId: account.id,
        error: '未同步'
      })
      continue
    }
    
    if (onProgress) {
      onProgress({
        current: i,
        total: accounts.length,
        account,
        status: 'checking'
      })
    }
    
    try {
      const masssendInfo = await getMasssendInfo(account.id, account.syncedAppmsgid)
      
      results.push({
        success: true,
        accountId: account.id,
        result: {
          quotaInfo: masssendInfo.quotaItemList,
          needScanQrcode: masssendInfo.needScanQrcode,
          operationSeq: masssendInfo.operationSeq,
          contactGroupList: masssendInfo.contactGroupList
        }
      })
    } catch (error) {
      results.push({
        success: false,
        accountId: account.id,
        error: error.message
      })
    }
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: accounts.length,
        account,
        status: results[results.length - 1].success ? 'checked' : 'failed'
      })
    }
    
    // 延迟
    if (i < accounts.length - 1 && delayMs > 0) {
      await sleep(delayMs)
    }
  }
  
  return results
}

/**
 * 构建单个账号的发布参数
 * @param {Object} account - 账号信息（包含 decisions、checkResult 等）
 * @param {Object} globalParams - 全局发布参数
 * @param {Object} copyrightResult - 原创检测结果（全局共用）
 * @param {boolean} isSourceAccount - 是否是源账号
 * @returns {Object} 发布参数
 */
export function buildPublishParams(account, globalParams, copyrightResult, isSourceAccount = false) {
  console.log('[buildPublishParams] globalParams:', {
    hasNotify: globalParams.hasNotify,
    isFreePublish: globalParams.isFreePublish,
    sendTime: globalParams.sendTime
  })
  console.log('[buildPublishParams] account.decisions:', account.decisions)
  
  const params = {
    appmsgid: account.syncedAppmsgid,
    sendTime: globalParams.sendTime || 0,
    hasNotify: account.decisions?.useNotify !== false && globalParams.hasNotify,
    isFreePublish: account.decisions?.useNotify === false || globalParams.isFreePublish,
    operationSeq: account.checkResult?.operationSeq || '',
    appmsgItemCount: globalParams.appmsgItemCount || 1
  }
  
  console.log('[buildPublishParams] 计算结果 hasNotify:', params.hasNotify, 'isFreePublish:', params.isFreePublish)
  
  // 原创问题处理 - 添加 reprint_info
  if (copyrightResult?.copyright === 1) {
    // listRaw 只能用于源账号，因为其中的 article_url 是源账号的
    // 对于目标账号，只传 reprintInfo，不传 listRaw
    if (isSourceAccount) {
      params.listRaw = copyrightResult.listRaw
    }
    params.reprintInfo = {
      item_list: copyrightResult.list.map((_, index) => ({
        idx: index + 1,
        reprint_type: 'EN_REPRINT_TYPE_SHARE',
        guide_words: account.decisions?.guideWords?.[index] || globalParams.guideWords?.[index] || ''
      }))
    }
  }
  
  // 扫码验证码
  if (account.decisions?.qrcodeUuid) {
    params.code = account.decisions.qrcodeUuid
  }
  
  // 分组通知
  if (globalParams.groupNotify?.enabled) {
    params.groupid = globalParams.groupNotify.groupid
    params.sex = globalParams.groupNotify.sex
    params.country = globalParams.groupNotify.country
    params.province = globalParams.groupNotify.province
    params.city = globalParams.groupNotify.city
  }
  
  return params
}

/**
 * 创建批量发布任务
 * @param {Object} publishState - 发布状态
 * @param {Object} options - 可选配置
 * @returns {Promise<Object>} 发布结果
 */
export async function createBatchPublishTask(publishState, options = {}) {
  const {
    taskName = '批量发布',
    delayMs = 1000
  } = options

  const { 
    createTask, 
    updateTask, 
    completeTask, 
    failTask, 
    cancelTask,
    isTaskPaused, 
    isTaskCancelled,
    showTaskPopover
  } = useTaskManager()

  // 过滤出需要发布的账号（排除被跳过的）
  const accountsToPublish = publishState.targetAccounts.filter(
    account => !account.decisions?.skipReason && account.syncStatus === 'synced'
  )

  if (accountsToPublish.length === 0) {
    return {
      success: false,
      message: '没有可发布的账号',
      total: 0,
      successCount: 0,
      failedCount: 0,
      failedItems: []
    }
  }

  // 创建任务
  const task = createTask(taskName, accountsToPublish.length, 'publish', '准备发布...')
  
  // 打开任务中心弹窗
  showTaskPopover()

  // 发布结果统计
  const result = {
    success: true,
    total: accountsToPublish.length,
    successCount: 0,
    failedCount: 0,
    failedItems: [],
    taskId: task.id
  }

  try {
    updateTask(task.id, 0, 'running', '开始批量发布...')

    for (let i = 0; i < accountsToPublish.length; i++) {
      // 检查任务是否被中止
      if (isTaskCancelled(task.id)) {
        result.cancelled = true
        break
      }

      // 检查任务是否被暂停
      while (isTaskPaused(task.id)) {
        await sleep(500)
        if (isTaskCancelled(task.id)) break
      }

      const account = accountsToPublish[i]
      
      try {
        updateTask(task.id, i, 'running', `正在发布到《${account.name}》`)
        
        // 判断是否是源账号
        const isSourceAccount = account.id === publishState.sourceDraft?.accountId
        
        // 构建发布参数
        const params = buildPublishParams(
          account, 
          publishState.publishParams, 
          publishState.sourceDraft?.copyrightResult,
          isSourceAccount
        )
        
        console.log('[批量发布] 账号:', account.name, 'ID:', account.id, '是否源账号:', isSourceAccount)
        console.log('[批量发布] 发布参数:', JSON.stringify(params, null, 2))
        console.log('[批量发布] 账号信息:', {
          syncedAppmsgid: account.syncedAppmsgid,
          operationSeq: account.checkResult?.operationSeq,
          decisions: account.decisions
        })
        
        // 执行发布
        const publishResult = await publishAppmsg(account.id, params)
        console.log('[批量发布] 发布结果:', publishResult)
        
        if (publishResult.success) {
          account.publishStatus = 'published'
          result.successCount++
          updateTask(task.id, i + 1, 'running', `已发布到《${account.name}》`)
        } else {
          throw new Error(publishResult.msg || '发布失败')
        }
        
      } catch (error) {
        account.publishStatus = 'failed'
        account.publishError = error.message
        result.failedCount++
        result.failedItems.push({
          accountId: account.id,
          accountName: account.name,
          error: error.message
        })
        updateTask(task.id, i + 1, 'running', `发布到《${account.name}》失败`)
      }

      // 延迟
      if (i < accountsToPublish.length - 1 && delayMs > 0) {
        await sleep(delayMs)
      }
    }

    // 判断任务最终状态
    if (result.cancelled) {
      cancelTask(task.id)
    } else if (result.failedCount === 0) {
      completeTask(task.id)
    } else if (result.successCount === 0) {
      failTask(task.id, '全部发布失败')
    } else {
      // 部分成功，仍标记为完成
      completeTask(task.id)
    }

  } catch (error) {
    failTask(task.id, error.message)
    result.success = false
    result.error = error.message
  }

  return result
}

/**
 * 初始化批量发布状态
 * @param {Object} sourceDraft - 源草稿信息
 * @param {Array} targetAccounts - 目标账号列表
 * @returns {Object} 批量发布状态对象
 */
export function createBatchPublishState(sourceDraft, targetAccounts) {
  return {
    // 源草稿信息
    sourceDraft: {
      accountId: sourceDraft.accountId || '',
      appmsgid: sourceDraft.appmsgid || sourceDraft.app_id || '',
      title: sourceDraft.title || '',
      detail: sourceDraft.detail || null,
      copyrightResult: null
    },
    
    // 目标账号列表（带状态）
    targetAccounts: targetAccounts.map(account => ({
      id: account.id,
      name: account.name,
      avatar: account.avatar,
      // 同步状态
      syncStatus: 'pending', // pending | syncing | synced | failed
      syncedAppmsgid: null,
      syncError: null,
      
      // 检测状态（获取群发信息）
      checkStatus: 'pending', // pending | checking | checked | failed
      checkResult: {
        quotaInfo: null,
        needScanQrcode: false,
        operationSeq: '',
        contactGroupList: []
      },
      
      // 问题处理（用户决策后填充）
      decisions: {
        skipReason: null,
        useNotify: true,
        guideWords: [],
        qrcodeValidated: false,
        qrcodeUuid: ''
      },
      
      // 发布状态
      publishStatus: 'pending', // pending | publishing | published | failed | skipped
      publishError: null
    })),
    
    // 全局发布参数
    publishParams: {
      hasNotify: true,
      isFreePublish: false,
      sendTime: 0,
      appmsgItemCount: 1,
      guideWords: [],
      groupNotify: {
        enabled: false,
        groupid: -1,
        sex: -1,
        country: '',
        province: '',
        city: ''
      }
    },
    
    // 当前步骤
    currentStep: 0
    // 0: 设置发布参数
    // 1: 文章同步中
    // 2: 预检测中
    // 3: 问题处理
    // 4: 批量发布中
    // 5: 发布完成
  }
}
