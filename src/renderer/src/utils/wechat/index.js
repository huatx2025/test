/**
 * 微信公众号工具函数统一导出
 */

// 认证相关
export { 
  extractToken, 
  getWechatAccountData, 
  saveWechatAccount 
} from './auth'

// 批量任务功能
export { createDeleteWechatDraftsTask, createSyncWechatDraftTask, convertAppMsgInfoToParams } from './appmsg'

