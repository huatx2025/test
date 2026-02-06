/**
 * 草稿数据转换工具
 * 将微信草稿箱获取的结果转换为保存草稿的参数格式
 */


/**
 * 将获取草稿结果转换为保存草稿参数
 * @param {Object} draftResult - 获取草稿的JSON结果
 * @param {Object} account - 账号信息 {token, ...}
 * @returns {Object} 保存草稿的表单参数对象
 */
export function convertDraftResultToSaveParams(draftResult, account) {
  if (!draftResult || !draftResult.item || !draftResult.item[0]) {
    throw new Error('无效的草稿数据')
  }

  const item = draftResult.item[0]
  const multiItems = item.multi_item || []
  
  if (multiItems.length === 0) {
    throw new Error('草稿中没有文章内容')
  }

  // 基础参数
  const params = {
    token: account.token,
    lang: 'zh_CN',
    f: 'json',
    ajax: 1,
    random: Math.random(),
    AppMsgId: item.app_id,
    count: multiItems.length,
    articlenum: multiItems.length,
    isnew: 0,
    operate_from: 'Chrome',
    pre_timesend_set: 0,
    is_auto_type_setting: 3,
    save_type: 0,
    isneedsave: 0,
    data_seq: item.data_seq || '',
    remind_flag: null
  }

  // 遍历多图文，添加每篇文章的参数
  multiItems.forEach((article, index) => {
    const suffix = index // 0, 1, 2...
    
    // 基础字段
    params[`title${suffix}`] = article.title || ''
    params[`author${suffix}`] = article.author || ''
    params[`digest${suffix}`] = article.digest || ''
    params[`content${suffix}`] = article.content || ''
    params[`sourceurl${suffix}`] = article.source_url || ''
    
    // 封面图
    params[`cdn_url${suffix}`] = article.cdn_url || ''
    params[`cdn_url_back${suffix}`] = article.cdn_url_back || ''
    params[`cdn_235_1_url${suffix}`] = article.cdn_235_1_url || ''
    params[`cdn_1_1_url${suffix}`] = article.cdn_1_1_url || ''
    params[`cdn_16_9_url${suffix}`] = article.cdn_16_9_url || ''
    params[`cdn_3_4_url${suffix}`] = article.cdn_3_4_url || ''
    params[`cdn_finder_url${suffix}`] = article.cdn_finder_url || ''
    params[`cdn_video_url${suffix}`] = article.cdn_video_url || ''
    params[`crop_list${suffix}`] = typeof article.crop_list === 'string' 
      ? article.crop_list 
      : JSON.stringify(article.crop_list || '')
    
    // 显示设置
    params[`show_cover_pic${suffix}`] = article.show_cover_pic || 0
    params[`fileid${suffix}`] = article.file_id || 0
    params[`last_choose_cover_from${suffix}`] = article.last_choose_cover_from || 0
    params[`app_cover_auto${suffix}`] = article.app_cover_auto || 0
    
    // 评论设置
    params[`need_open_comment${suffix}`] = article.need_open_comment ? 1 : 0
    params[`only_fans_can_comment${suffix}`] = article.only_fans_can_comment ? 1 : 0
    params[`only_fans_days_can_comment${suffix}`] = article.only_fans_days_can_comment || 0
    params[`reply_flag${suffix}`] = article.reply_flag ?? 2
    params[`not_pay_can_comment${suffix}`] = article.not_pay_can_comment || 0
    params[`auto_elect_comment${suffix}`] = article.auto_elect_comment ?? 1
    params[`auto_elect_reply${suffix}`] = article.auto_elect_reply ?? 1
    params[`option_version${suffix}`] = article.option_version || 5
    params[`open_fansmsg${suffix}`] = article.open_fansmsg || 0
    
    // 版权设置
    params[`copyright_type${suffix}`] = article.copyright_type || 0
    params[`is_cartoon_copyright${suffix}`] = article.is_cartoon_copyright || 0
    params[`allow_fast_reprint${suffix}`] = article.allow_fast_reprint || 0
    params[`allow_reprint${suffix}`] = article.allow_reprint || 0
    params[`allow_reprint_modify${suffix}`] = article.allow_reprint_modify || 0
    params[`original_article_type${suffix}`] = article.original_article_type || ''
    params[`ori_white_list${suffix}`] = typeof article.ori_white_list === 'string'
      ? article.ori_white_list
      : JSON.stringify(article.ori_white_list || { white_list: [] })
    
    // 赞赏设置
    params[`can_reward${suffix}`] = article.can_reward || 0
    params[`pay_gifts_count${suffix}`] = article.pay_gifts_count || 0
    params[`reward_reply_id${suffix}`] = article.reward_reply_id || ''
    
    // 付费设置
    params[`is_pay_subscribe${suffix}`] = article.is_pay_subscribe || 0
    params[`pay_fee${suffix}`] = article.pay_fee || ''
    params[`pay_preview_percent${suffix}`] = article.pay_preview_percent || ''
    params[`pay_desc${suffix}`] = article.pay_desc || ''
    params[`free_content${suffix}`] = article.free_content || ''
    params[`pay_album_info${suffix}`] = article.pay_album_info || ''
    
    // 广告设置
    params[`can_insert_ad${suffix}`] = article.can_insert_ad ?? 1
    params[`open_keyword_ad${suffix}`] = article.open_keyword_ad || 0
    params[`open_comment_ad${suffix}`] = article.open_comment_ad || 0
    params[`insert_ad_mode${suffix}`] = article.insert_ad_mode || ''
    params[`incontent_ad_count${suffix}`] = article.incontent_ad_count || 0
    
    // 视频相关
    params[`is_finder_video${suffix}`] = article.is_finder_video || 0
    params[`finder_draft_id${suffix}`] = article.finder_draft_id || 0
    params[`related_video${suffix}`] = article.related_video || ''
    params[`is_video_recommend${suffix}`] = article.is_video_recommend || 0
    params[`vid_type${suffix}`] = article.vid_type || ''
    params[`shortvideofileid${suffix}`] = article.shortvideofileid || ''
    
    // 其他设置
    params[`applyori${suffix}`] = article.applyori || 0
    params[`ad_video_transition${suffix}`] = article.ad_video_transition || ''
    params[`writerid${suffix}`] = article.writerid || 0
    params[`auto_gen_digest${suffix}`] = article.auto_gen_digest || 0
    params[`is_user_title${suffix}`] = article.is_user_title || ''
    params[`music_id${suffix}`] = article.music_id || ''
    params[`voteid${suffix}`] = article.voteid || ''
    params[`voteismlt${suffix}`] = article.voteismlt || ''
    params[`supervoteid${suffix}`] = article.supervoteid || ''
    params[`super_vote_id${suffix}`] = article.super_vote_id || 0
    params[`cardid${suffix}`] = article.cardid || ''
    params[`cardquantity${suffix}`] = article.cardquantity || ''
    params[`cardlimit${suffix}`] = article.cardlimit || ''
    params[`platform${suffix}`] = article.platform || ''
    params[`video_ori_status${suffix}`] = article.video_ori_status || ''
    params[`hit_nickname${suffix}`] = article.hit_nickname || ''
    params[`fee${suffix}`] = article.fee || 0
    params[`ad_id${suffix}`] = article.ad_id || ''
    params[`guide_words${suffix}`] = article.guide_words || ''
    params[`is_share_copyright${suffix}`] = article.is_share_copyright || 0
    params[`share_copyright_url${suffix}`] = article.share_copyright_url || ''
    params[`source_article_type${suffix}`] = article.source_article_type || ''
    params[`reprint_recommend_title${suffix}`] = article.reprint_recommend_title || ''
    params[`reprint_recommend_content${suffix}`] = article.reprint_recommend_content || ''
    params[`share_page_type${suffix}`] = article.share_page_type || 0
    params[`share_imageinfo${suffix}`] = typeof article.share_imageinfo === 'string'
      ? article.share_imageinfo
      : JSON.stringify(article.share_imageinfo || { list: [] })
    params[`share_video_id${suffix}`] = article.share_video_id || ''
    params[`dot${suffix}`] = typeof article.dot === 'string'
      ? article.dot
      : JSON.stringify(article.dot || {})
    params[`share_voice_id${suffix}`] = article.share_voice_id || ''
    params[`share_finder_audio_username${suffix}`] = article.share_finder_audio_username || ''
    params[`share_finder_audio_exportid${suffix}`] = article.share_finder_audio_exportid || ''
    params[`mmlistenitem_json_buf${suffix}`] = article.mmlistenitem_json_buf || ''
    params[`categories_list${suffix}`] = typeof article.categories_list === 'string'
      ? article.categories_list
      : JSON.stringify(article.categories_list || [])
    params[`compose_info${suffix}`] = article.compose_info 
      ? (typeof article.compose_info === 'string' ? article.compose_info : JSON.stringify(article.compose_info))
      : ''
    params[`appmsg_album_info${suffix}`] = typeof article.appmsg_album_info === 'string'
      ? article.appmsg_album_info
      : JSON.stringify(article.appmsg_album_info || { appmsg_album_infos: [] })
    params[`audio_info${suffix}`] = typeof article.audio_info === 'string'
      ? article.audio_info
      : JSON.stringify(article.audio_info || { audio_infos: [] })
    params[`danmu_pub_type${suffix}`] = article.danmu_pub_type || 0
    params[`mp_video_info${suffix}`] = typeof article.mp_video_info === 'string'
      ? article.mp_video_info
      : JSON.stringify(article.mp_video_info || { list: [] })
    params[`appmsg_danmu_pub_type${suffix}`] = article.appmsg_danmu_pub_type || ''
    params[`is_set_sync_to_finder${suffix}`] = article.is_set_sync_to_finder || 0
    params[`sync_to_finder_cover${suffix}`] = article.sync_to_finder_cover || ''
    params[`sync_to_finder_cover_source${suffix}`] = article.sync_to_finder_cover_source || ''
    params[`import_to_finder${suffix}`] = article.import_to_finder || 0
    params[`import_from_finder_export_id${suffix}`] = article.import_from_finder_export_id || ''
    params[`style_type${suffix}`] = article.style_type ?? 3
    params[`sticker_info${suffix}`] = typeof article.sticker_info === 'string'
      ? article.sticker_info
      : JSON.stringify(article.sticker_info || {
          is_stickers: 0,
          common_stickers_num: 0,
          union_stickers_num: 0,
          sticker_id_list: [],
          has_invalid_sticker: 0
        })
    params[`new_pic_process${suffix}`] = article.new_pic_process || 0
    params[`disable_recommend${suffix}`] = article.disable_recommend || 0
    params[`claim_source_type${suffix}`] = article.claim_source_type || 2
    params[`is_user_no_claim_source${suffix}`] = article.is_user_no_claim_source || 0
    params[`msg_index_id${suffix}`] = article.msg_index_id || `0_${item.app_id}_${suffix}`
    params[`convert_to_image_share_page${suffix}`] = article.convert_to_image_share_page || ''
    params[`convert_from_image_share_page${suffix}`] = article.convert_from_image_share_page || 0
    params[`multi_picture_cover${suffix}`] = article.multi_picture_cover || 0
    params[`title_gen_type${suffix}`] = article.title_gen_type || 0
    params[`copyright_img_list${suffix}`] = typeof article.copyright_img_list === 'string'
      ? article.copyright_img_list
      : JSON.stringify(article.copyright_img_list || { max_width: 578, img_list: [] })
  })
  
  // 构建 req 参数（只对第一篇文章）
  const firstArticle = multiItems[0]
  params['req'] = JSON.stringify({
    idx_infos: multiItems.map((article, index) => ({
      save_old: 0,
      cps_info: { cps_import: 0 },
      red_packet_cover_list: { list: [] },
      claim_source: article.claim_source || {
        is_user_no_claim_source: article.is_user_no_claim_source || 0,
        media_source_type_info: article.media_source_type_info || {
          media_source_from: 2,
          biz_link_url: '',
          other_from_account: '',
          biz_nickname: '',
          biz_headimgurl: '',
          news_position_info: {
            country: '',
            province: '',
            city: ''
          },
          news_time: 0
        }
      },
      line_info: { scene: 2 },
      window_product: {},
      link_info: {},
      appmsg_link: {},
      weapp_link: {},
      yqj_info: {},
      ai_pic_info: article.ai_pic_info || { 
        cover_source: 0, 
        ai_pic_id: [], 
        cover_pic_id: '' 
      },
      single_video_snap_card: {},
      product_activity: article.product_activity || {},
      footer_gift_activity: article.footer_gift_activity || {},
      footer_common_shops: article.footer_common_shops || [],
      footer_product_card: article.footer_product_card || {},
      location: {}
    })),
    appmsg_id: item.app_id,
    is_use_flag: 0,
    template_version: '92831144'
  })
  
  return params
}

/**
 * 提取草稿中的单篇文章数据（用于编辑器填充）
 * @param {Object} draftResult - 获取草稿的JSON结果
 * @param {number} index - 文章索引（多图文时使用，默认0）
 * @returns {Object} 文章数据对象
 */
export function extractArticleFromDraft(draftResult, index = 0) {
  if (!draftResult || !draftResult.item || !draftResult.item[0]) {
    throw new Error('无效的草稿数据')
  }

  const item = draftResult.item[0]
  const multiItems = item.multi_item || []
  
  if (multiItems.length === 0) {
    throw new Error('草稿中没有文章内容')
  }
  
  if (index >= multiItems.length) {
    throw new Error(`文章索引超出范围，共${multiItems.length}篇文章`)
  }
  
  const article = multiItems[index]
  
  return {
    app_id: item.app_id,
    data_seq: item.data_seq,
    title: article.title || '',
    author: article.author || '',
    digest: article.digest || '',
    content: article.content || '',
    source_url: article.source_url || '',
    cover_url: article.cdn_url || '',
    show_cover_pic: article.show_cover_pic || 0,
    need_open_comment: article.need_open_comment || false,
    only_fans_can_comment: article.only_fans_can_comment || false,
    copyright_type: article.copyright_type || 0,
    can_reward: article.can_reward || 0,
    is_pay_subscribe: article.is_pay_subscribe || 0,
    style_type: article.style_type ?? 3,
    // 保留完整的原始数据，便于后续使用
    _raw: article
  }
}

/**
 * 将表单参数对象转换为 URL 编码的字符串
 * @param {Object} params - 参数对象
 * @returns {string} URL 编码的字符串
 */
export function paramsToUrlEncoded(params) {
  return Object.keys(params)
    .map(key => {
      const value = params[key]
      // null 或 undefined 转为空字符串
      const strValue = value === null || value === undefined ? '' : String(value)
      return `${encodeURIComponent(key)}=${encodeURIComponent(strValue)}`
    })
    .join('&')
}

export default {
  convertDraftResultToSaveParams,
  extractArticleFromDraft,
  paramsToUrlEncoded
}


