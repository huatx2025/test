import { useTaskManager } from '@/composables/useTaskManager'
import { deleteWechatDraft, operateWechatDraft } from '@/.thidparty_api/wechat'

/**
 * 微信公众号草稿相关
 */

/**
 * 创建批量删除草稿任务
 * @param {string|number} accountId - 账号ID
 * @param {Array<Object|string|number>} drafts - 要删除的草稿数组，可以是草稿对象数组或ID数组
 * @param {Object} options - 可选配置
 * @param {string} options.taskName - 任务名称，默认为"批量删除草稿"
 * @param {number} options.delayMs - 每次删除之间的延迟（毫秒），默认100ms，避免请求过快
 * @returns {Promise<Object>} 批量删除结果
 */
export async function createDeleteWechatDraftsTask(accountId, drafts, options = {}) {
  const {
    taskName = '批量删除草稿',
    delayMs = 100
  } = options

  // 标准化 drafts 格式，支持传入对象数组或ID数组
  const draftItems = drafts.map(item => {
    if (typeof item === 'object' && item !== null) {
      return {
        app_id: item.app_id,
        title: item.title || '无标题'
      }
    } else {
      return {
        app_id: item,
        title: '草稿'
      }
    }
  })

  // 创建任务管理器
  const { 
    createTask, 
    updateTask, 
    completeTask, 
    failTask, 
    cancelTask,
    isTaskPaused, 
    isTaskCancelled,
    setTaskRequestId
  } = useTaskManager()

  // 创建任务
  const task = createTask(taskName, draftItems.length, 'delete', '准备删除草稿...')

  // 删除结果统计
  const result = {
    success: true,
    total: draftItems.length,
    successCount: 0,
    failedCount: 0,
    failedItems: [],
    taskId: task.id,
    cancelled: false
  }

  try {
    // 更新任务状态为运行中
    updateTask(task.id, 0, 'running', '准备删除草稿...')

    // 逐个删除草稿
    for (let i = 0; i < draftItems.length; i++) {
      // 检查任务是否被中止
      if (isTaskCancelled(task.id)) {
        result.cancelled = true
        result.success = false
        cancelTask(task.id)
        console.log('任务已中止')
        break
      }

      // 检查任务是否被暂停，如果暂停则等待
      while (isTaskPaused(task.id)) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 在暂停期间也检查是否被中止
        if (isTaskCancelled(task.id)) {
          result.cancelled = true
          result.success = false
          cancelTask(task.id)
          console.log('任务已中止')
          break
        }
      }

      // 如果在暂停检查中被中止，则退出
      if (result.cancelled) {
        break
      }

      const draftItem = draftItems[i]
      const appmsgid = draftItem.app_id
      
      try {
        // 更新任务进度 - 显示正在删除的草稿标题
        updateTask(task.id, i, 'running', `正在删除《${draftItem.title}》`)
        
        // 生成请求ID
        const requestId = `task_${task.id}_item_${i}_${Date.now()}`
        
        // 设置当前请求ID，用于支持中止
        setTaskRequestId(task.id, requestId)
        
        // 执行删除
        await deleteWechatDraft(accountId, appmsgid, requestId)
        
        // 清除请求ID
        setTaskRequestId(task.id, null)
        
        result.successCount++
        
        // 更新任务进度
        updateTask(task.id, i + 1, 'running', `已删除《${draftItem.title}》`)
        
      } catch (error) {
        // 清除请求ID
        setTaskRequestId(task.id, null)
        
        console.log(error.message);
        
        // 如果是请求被中止，不记录为失败，直接退出
        if (error.aborted) {
          console.log('请求被中止')
          result.cancelled = true
          result.success = false
          break
        }
        
        // 记录失败项
        result.failedCount++
        result.failedItems.push({
          appmsgid,
          title: draftItem.title,
          error: error.message
        })
        
        // 更新任务进度（仍然继续）- 显示失败信息
        updateTask(task.id, i + 1, 'running', `删除《${draftItem.title}》失败`)
      }

      // 延迟，避免请求过快
      if (i < draftItems.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    // 判断任务最终状态
    if (result.cancelled) {
      // 任务被中止
      cancelTask(task.id)
    } else if (result.failedCount === 0) {
      // 全部成功
      completeTask(task.id)
    } else if (result.successCount === 0) {
      // 全部失败
      result.success = false
      failTask(task.id, `删除失败 ${result.failedCount}/${result.total}`)
    } else {
      // 部分成功
      completeTask(task.id)
      result.success = false
    }

  } catch (error) {
    // 整体任务失败
    result.success = false
    failTask(task.id, error.message)
    throw error
  }

  return result
}

/**
 * 创建同步草稿到其它公众号任务
 * @param {Object} draftDetail - 草稿详情（app_msg_info）
 * @param {Array<Object>} targetAccounts - 目标公众号账号数组，包含 id 和 name
 * @param {Object} options - 可选配置
 * @param {string} options.taskName - 任务名称，默认为"同步草稿"
 * @param {number} options.delayMs - 每次同步之间的延迟（毫秒），默认1000ms
 * @returns {Promise<Object>} 同步结果
 */
export async function createSyncWechatDraftTask(draftDetail, targetAccounts, options = {}) {
  const {
    taskName = '同步草稿',
    delayMs = 1000
  } = options

  // 创建任务管理器
  const { 
    createTask, 
    updateTask, 
    completeTask, 
    failTask, 
    cancelTask,
    isTaskPaused, 
    isTaskCancelled,
    setTaskRequestId
  } = useTaskManager()

  console.log("草稿详情",draftDetail);
  
  // 创建任务
  const task = createTask(taskName, targetAccounts.length, 'sync', '准备同步草稿...')

  // 同步结果统计
  const result = {
    success: true,
    total: targetAccounts.length,
    successCount: 0,
    failedCount: 0,
    failedItems: [],
    taskId: task.id,
    cancelled: false
  }

  try {
    // 更新任务状态为运行中
    updateTask(task.id, 0, 'running', '准备同步草稿...')

    // 逐个同步到目标账号
    for (let i = 0; i < targetAccounts.length; i++) {
      // 检查任务是否被中止
      if (isTaskCancelled(task.id)) {
        result.cancelled = true
        result.success = false
        cancelTask(task.id)
        console.log('任务已中止')
        break
      }

      // 检查任务是否被暂停，如果暂停则等待
      while (isTaskPaused(task.id)) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 在暂停期间也检查是否被中止
        if (isTaskCancelled(task.id)) {
          result.cancelled = true
          result.success = false
          cancelTask(task.id)
          console.log('任务已中止')
          break
        }
      }

      // 如果在暂停检查中被中止，则退出
      if (result.cancelled) {
        break
      }

      const account = targetAccounts[i]
      
      try {
        // 更新任务进度
        updateTask(task.id, i, 'running', `正在同步到《${account.name}》`)
        
        // 生成请求ID
        const requestId = `task_${task.id}_account_${i}_${Date.now()}`
        
        // 设置当前请求ID，用于支持中止
        setTaskRequestId(task.id, requestId)
        
        // 执行同步（创建草稿）
        await operateWechatDraft(account.id, 'create', convertAppMsgInfoToParams(draftDetail, 'create'))
        
        // 清除请求ID
        setTaskRequestId(task.id, null)
        
        result.successCount++
        
        // 更新任务进度
        updateTask(task.id, i + 1, 'running', `已同步到《${account.name}》`)
        
      } catch (error) {
        // 清除请求ID
        setTaskRequestId(task.id, null)
        
        console.log('同步失败:', error.message)
        
        // 如果是请求被中止，不记录为失败，直接退出
        if (error.aborted) {
          console.log('请求被中止')
          result.cancelled = true
          result.success = false
          break
        }
        
        // 记录失败项
        result.failedCount++
        result.failedItems.push({
          accountId: account.id,
          accountName: account.name,
          error: error.message
        })
        
        // 更新任务进度（仍然继续）
        updateTask(task.id, i + 1, 'running', `同步到《${account.name}》失败`)
      }

      // 延迟，避免请求过快
      if (i < targetAccounts.length - 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    // 判断任务最终状态
    if (result.cancelled) {
      // 任务被中止
      cancelTask(task.id)
    } else if (result.failedCount === 0) {
      // 全部成功
      completeTask(task.id)
    } else if (result.successCount === 0) {
      // 全部失败
      result.success = false
      failTask(task.id, `同步失败 ${result.failedCount}/${result.total}`)
    } else {
      // 部分成功
      completeTask(task.id)
      result.success = false
    }

  } catch (error) {
    // 整体任务失败
    result.success = false
    failTask(task.id, error.message)
    throw error
  }

  return result
}



/**
 * 将 app_msg_info 转换为请求参数
 * @param {Object} app_msg_info - 文章信息对象
 * @returns {Object} 转换后的参数对象
 */
export function convertAppMsgInfoToParams(app_msg_info) {
  // 如果 app_msg_info 是字符串，先解析
  const msgInfo = typeof app_msg_info === 'string' ? JSON.parse(app_msg_info) : app_msg_info
  
  const items = msgInfo.item || []
  
  // 收集所有的 multi_item，构建扁平的文章数组
  // 每个 item 可能包含多个 multi_item（多图文）
  const allArticles = []
  items.forEach((item) => {
    if (item.multi_item && item.multi_item.length > 0) {
      // 如果有多图文，遍历所有 multi_item
      item.multi_item.forEach((multiItem) => {
        allArticles.push({
          item: item, // 保留原始 item 引用，用于获取 item 级别的字段
          multiItem: multiItem
        })
      })
    } else {
      // 如果没有 multi_item，使用 item 本身作为文章
      allArticles.push({
        item: item,
        multiItem: {}
      })
    }
  })
  
  const articleCount = allArticles.length
  
  // 基础参数
  const params = {
    fingerprint: '',
    random: Math.random().toString(),
    AppMsgId: msgInfo.app_id || '',
    count: articleCount.toString(),
    data_seq: msgInfo.data_seq || '0',
    operate_from: 'Chrome',
    isnew: msgInfo.app_id ? '1' : '0',
    articlenum: articleCount.toString(),
    pre_timesend_set: '0'
  }
  
  // 遍历每篇文章
  allArticles.forEach((articleData, index) => {
    const item = articleData.item
    const multiItem = articleData.multiItem
    
    // 视频相关
    params[`is_finder_video${index}`] = '0'
    params[`finder_draft_id${index}`] = '0'
    params[`applyori${index}`] = item.is_original || '0'
    params[`ad_video_transition${index}`] = ''
    params[`can_reward${index}`] = item.can_reward || '0'
    params[`pay_gifts_count${index}`] = item.pay_gifts_count || '0'
    params[`reward_reply_id${index}`] = ''
    params[`related_video${index}`] = Array.isArray(item.related_video) ? '' : (item.related_video || '')
    params[`is_video_recommend${index}`] = item.is_video_recommend || '-1'
    
    // 基本信息
    params[`title${index}`] = multiItem.title || item.title || ''
    params[`is_user_title${index}`] = ''
    params[`author${index}`] = multiItem.author || item.author || ''
    params[`writerid${index}`] = item.writerid || '0'
    params[`fileid${index}`] = multiItem.file_id || item.file_id || ''
    params[`digest${index}`] = multiItem.digest || item.digest || ''
    params[`auto_gen_digest${index}`] = item.auto_gen_digest || '0'
    params[`content${index}`] = multiItem.content || item.content || ''
    params[`sourceurl${index}`] = multiItem.source_url || item.source_url || ''
    
    // 封面相关
    params[`last_choose_cover_from${index}`] = item.last_choose_cover_from || '0'
    params[`cdn_url${index}`] = multiItem.cdn_url || item.cdn_url || ''
    params[`cdn_235_1_url${index}`] = multiItem.cdn_235_1_url || item.cdn_235_1_url || ''
    params[`cdn_16_9_url${index}`] = multiItem.cdn_16_9_url || item.cdn_16_9_url || ''
    params[`cdn_3_4_url${index}`] = multiItem.cdn_3_4_url || item.cdn_3_4_url || ''
    params[`cdn_1_1_url${index}`] = multiItem.cdn_1_1_url || item.cdn_1_1_url || ''
    params[`cdn_finder_url${index}`] = ''
    params[`cdn_video_url${index}`] = ''
    params[`cdn_url_back${index}`] = multiItem.cdn_url_back || item.cdn_url_back || ''
    params[`crop_list${index}`] = typeof multiItem.crop_list === 'string' ? multiItem.crop_list : (typeof item.crop_list === 'string' ? item.crop_list : JSON.stringify(multiItem.crop_list || item.crop_list || {}))
    params[`app_cover_auto${index}`] = item.app_cover_auto || '0'
    
    // 评论相关
    params[`need_open_comment${index}`] = item.need_open_comment ? '1' : '0'
    params[`only_fans_can_comment${index}`] = item.only_fans_can_comment ? '1' : '0'
    params[`only_fans_days_can_comment${index}`] = item.only_fans_days_can_comment || '0'
    params[`reply_flag${index}`] = item.reply_flag || '2'
    params[`not_pay_can_comment${index}`] = item.not_pay_can_comment || '0'
    params[`auto_elect_comment${index}`] = item.auto_elect_comment !== undefined ? item.auto_elect_comment : '1'
    params[`auto_elect_reply${index}`] = item.auto_elect_reply !== undefined ? item.auto_elect_reply : '1'
    params[`option_version${index}`] = item.option_version || '5'
    params[`open_fansmsg${index}`] = item.open_fansmsg || '0'
    
    // 投票、音乐、卡片
    params[`music_id${index}`] = ''
    params[`voteid${index}`] = ''
    params[`voteismlt${index}`] = ''
    params[`supervoteid${index}`] = ''
    params[`super_vote_id${index}`] = item.super_vote_id || '0'
    params[`cardid${index}`] = ''
    params[`cardquantity${index}`] = ''
    params[`cardlimit${index}`] = ''
    params[`vid_type${index}`] = ''
    
    // 显示相关
    params[`show_cover_pic${index}`] = multiItem.show_cover_pic !== undefined ? multiItem.show_cover_pic : (item.show_cover_pic || '0')
    params[`shortvideofileid${index}`] = ''
    
    // 版权相关
    params[`copyright_type${index}`] = multiItem.copyright_type !== undefined ? multiItem.copyright_type : (item.copyright_type || '0')
    params[`is_cartoon_copyright${index}`] = item.is_cartoon_copyright || '0'
    params[`copyright_img_list${index}`] = typeof item.copyright_img_list === 'string' ? item.copyright_img_list : JSON.stringify(item.copyright_img_list || { max_width: 578, img_list: [] })
    
    // 原创转载相关（仅原创文章有这些字段）
    if (params[`copyright_type${index}`] === '1' || params[`copyright_type${index}`] === 1) {
      params[`platform${index}`] = multiItem.platform || item.platform || ''
      params[`allow_fast_reprint${index}`] = item.allow_fast_reprint !== undefined ? item.allow_fast_reprint : '1'
      params[`allow_reprint${index}`] = item.allow_reprint !== undefined ? item.allow_reprint : '0'
      params[`allow_reprint_modify${index}`] = item.allow_reprint_modify !== undefined ? item.allow_reprint_modify : '0'
      params[`original_article_type${index}`] = item.original_article_type || ''
      params[`ori_white_list${index}`] = typeof item.ori_white_list === 'string' ? item.ori_white_list : (typeof multiItem.ori_white_list === 'string' ? multiItem.ori_white_list : JSON.stringify(item.ori_white_list || multiItem.ori_white_list || { white_list: [] }))
      params[`video_ori_status${index}`] = ''
      params[`hit_nickname${index}`] = ''
    } else {
      // 转载文章的相关字段
      params[`releasefirst${index}`] = multiItem.releasefirst || item.releasefirst || ''
      params[`platform${index}`] = multiItem.platform || item.platform || ''
      params[`reprint_permit_type${index}`] = multiItem.reprint_permit_type || item.reprint_permit_type || ''
      params[`allow_fast_reprint${index}`] = item.allow_fast_reprint !== undefined ? item.allow_fast_reprint : '0'
      params[`allow_reprint${index}`] = ''
      params[`allow_reprint_modify${index}`] = ''
      params[`original_article_type${index}`] = ''
      params[`ori_white_list${index}`] = ''
      params[`video_ori_status${index}`] = ''
      params[`hit_nickname${index}`] = ''
    }
    
    // 付费相关
    params[`free_content${index}`] = item.free_content || ''
    params[`fee${index}`] = item.fee || '0'
    params[`ad_id${index}`] = ''
    params[`guide_words${index}`] = ''
    params[`is_share_copyright${index}`] = item.is_share_copyright || '0'
    params[`share_copyright_url${index}`] = item.share_copyright_url || ''
    params[`source_article_type${index}`] = item.source_article_type || ''
    params[`reprint_recommend_title${index}`] = ''
    params[`reprint_recommend_content${index}`] = ''
    
    // 分享相关
    params[`share_page_type${index}`] = item.share_page_type || '0'
    params[`share_imageinfo${index}`] = typeof item.share_imageinfo === 'string' ? item.share_imageinfo : JSON.stringify(item.share_imageinfo || { list: [] })
    params[`share_video_id${index}`] = item.share_video_id || ''
    params[`dot${index}`] = typeof item.dot === 'string' ? item.dot : JSON.stringify(item.dot || {})
    params[`share_voice_id${index}`] = ''
    params[`share_finder_audio_username${index}`] = ''
    params[`share_finder_audio_exportid${index}`] = ''
    params[`mmlistenitem_json_buf${index}`] = ''
    
    // 广告相关
    params[`insert_ad_mode${index}`] = item.insert_ad_mode || ''
    params[`categories_list${index}`] = Array.isArray(item.categories_list) ? JSON.stringify(item.categories_list) : (item.categories_list || '[]')
    
    // compose_info
    params[`compose_info${index}`] = typeof item.compose_info === 'string' ? item.compose_info : JSON.stringify(item.compose_info || { list: [] })
    
    // 付费订阅相关
    params[`is_pay_subscribe${index}`] = item.is_pay_subscribe || '0'
    params[`pay_fee${index}`] = ''
    params[`pay_preview_percent${index}`] = ''
    params[`pay_desc${index}`] = ''
    params[`pay_album_info${index}`] = ''
    params[`appmsg_album_info${index}`] = typeof item.appmsg_album_info === 'string' ? item.appmsg_album_info : JSON.stringify(item.appmsg_album_info || { appmsg_album_infos: [] })
    
    // 广告开关
    params[`can_insert_ad${index}`] = item.can_insert_ad !== undefined ? item.can_insert_ad : '1'
    params[`open_keyword_ad${index}`] = item.open_keyword_ad || '0'
    params[`open_comment_ad${index}`] = item.open_comment_ad || '0'
    
    // 音频相关
    params[`audio_info${index}`] = typeof item.audio_info === 'string' ? item.audio_info : JSON.stringify(item.audio_info || { audio_infos: [] })
    params[`danmu_pub_type${index}`] = item.danmu_pub_type || '0'
    params[`mp_video_info${index}`] = typeof item.mp_video_info === 'string' ? item.mp_video_info : JSON.stringify(item.mp_video_info || { list: {} })
    params[`appmsg_danmu_pub_type${index}`] = ''
    
    // 视频号相关
    params[`is_set_sync_to_finder${index}`] = '0'
    params[`sync_to_finder_cover${index}`] = ''
    params[`sync_to_finder_cover_source${index}`] = ''
    params[`import_to_finder${index}`] = '0'
    params[`import_from_finder_export_id${index}`] = ''
    
    // 样式相关
    params[`style_type${index}`] = item.style_type || multiItem.style_type || '3'
    params[`sticker_info${index}`] = typeof item.sticker_info === 'string' ? item.sticker_info : JSON.stringify(item.sticker_info || { is_stickers: 0, common_stickers_num: 0, union_stickers_num: 0, sticker_id_list: [], has_invalid_sticker: 0 })
    params[`new_pic_process${index}`] = '0'
    params[`disable_recommend${index}`] = item.disable_recommend || '0'
    
    // 来源声明
    params[`claim_source_type${index}`] = multiItem.claim_source_type || item.claim_source?.claim_source_type || item.claim_source_type || ''
    params[`is_user_no_claim_source${index}`] = '0'
    params[`msg_index_id${index}`] = multiItem.msg_index_id || item.msg_index_id || ''
    
    // 转换相关
    params[`convert_to_image_share_page${index}`] = item.convert_to_image_share_page || ''
    params[`convert_from_image_share_page${index}`] = item.convert_from_image_share_page || ''
    params[`incontent_ad_count${index}`] = '0'
    params[`multi_picture_cover${index}`] = '0'
    params[`title_gen_type${index}`] = item.title_gen_type || '0'
  })
  
  // req 参数（包含更多复杂信息）
  params.req = JSON.stringify({
    idx_infos: allArticles.map((articleData) => {
      const item = articleData.item
      const multiItem = articleData.multiItem
      const idxInfo = {
        save_old: 0,
        cps_info: { cps_import: 0 },
        red_packet_cover_list: {},
        line_info: { is_appmsg_flag: 0, scene: 2 },
        window_product: {},
        link_info: {},
        appmsg_link: {},
        weapp_link: {},
        yqj_info: {},
        ai_pic_info: {
          cover_source: multiItem.ai_pic_info?.cover_source || item.ai_pic_info?.cover_source || 0,
          cover_pic_id: multiItem.ai_pic_info?.cover_pic_id || item.ai_pic_info?.cover_pic_id || '',
          ai_pic_id: multiItem.ai_pic_info?.ai_pic_id || item.ai_pic_info?.ai_pic_id || []
        },
        single_video_snap_card: {},
        product_activity: multiItem.product_activity || item.product_activity || {},
        footer_gift_activity: multiItem.footer_gift_activity || item.footer_gift_activity || {},
        footer_common_shops: multiItem.footer_common_shops || item.footer_common_shops || [],
        location: {}
      }
      
      // 来源声明
      const claimSource = multiItem.claim_source || item.claim_source
      if (claimSource && claimSource.claim_source_type) {
        idxInfo.claim_source = {
          is_user_no_claim_source: 0,
          media_source_type_info: claimSource.media_source_type_info || {}
        }
      } else {
        idxInfo.claim_source = {}
      }
      
      return idxInfo
    }),
    appmsg_id: msgInfo.app_id || 0,
    is_use_flag: 0,
    template_version: ''
  })
  
  // 其他全局参数
  params.remind_flag = null
  params.is_auto_type_setting = msgInfo.is_auto_type_setting || '3'
  params.save_type = '0'
  params.isneedsave = '0'
  
  console.log("保存草稿请求参数",params);
  
  return params
}
