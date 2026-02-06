import { cookiesToString } from '@/utils/cookieHelper'
import { useAccountStoreHook } from '@/store/modules/account'

/**
 * 微信公众号平台相关 API
 * TODO: 任何接口返回invalid session都将清除账户auth_data
 */

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

/**
 * 微信公众号API错误码映射表
 * base_resp.ret 对应的错误说明
 */
const WECHAT_ERROR_CODES = {
  "-206": "目前，服务负荷过大，请稍后重试。",
  "-99": "内容超出字数，请调整",
  "-6": "请输入验证码",
  "-5": "服务错误，请注意备份内容后重试。",
  "-1": "系统错误，请注意备份内容后重试",
  "412": "图文中含非法外链",
  "450": "非管理员/运营者登录，暂不支持群发视频号消息",
  "10001": "已被他人上传公开",
  "10002": "已被他人声明原创",
  "10003": "已被他人声明原创",
  "10004": "带有其他视频平台logo或水印",
  "10005": "搬运公共内容",
  "10006": "被平台取消原创",
  "10007": "时长小于10秒",
  "10008": "音频轨缺失",
  "10009": "视频轨缺失",
  "10010": "含有营销内容",
  "10701": "用户已被加入黑名单，无法向其发送消息",
  "10703": "对方关闭了接收消息",
  "10705": "该素材已被删除",
  "10801": "标题不能有违反公众平台协议、相关法律法规和政策的内容，请重新编辑。",
  "10802": "作者不能有违反公众平台协议、相关法律法规和政策的内容，请重新编辑。",
  "10803": "敏感链接，请重新添加。",
  "10804": "摘要不能有违反公众平台协议、相关法律法规和政策的内容，请重新编辑。",
  "10806": "正文不能有违反公众平台协议、相关法律法规和政策的内容，请重新编辑。",
  "10807": "该账号发表能力暂不可用。请6月5日20点后进行相关操作。",
  "13002": "该广告卡片已过期，删除后才可保存成功",
  "13003": "已有文章插入过该广告卡片，一个广告卡片仅可插入一篇文章",
  "13004": "该广告卡片与图文消息位置不一致",
  "13005": "今日有待投放赞助广告，你当前群发的内容不符合条件，此时群发将会导致广告违约，请继续编辑。",
  "14002": "没有【审核通过】的门店。确认有至少一个【审核通过】的门店后可进行卡券投放。",
  "14003": "投放用户缺少测试权限，请先设置白名单",
  "15806": "你所编辑的内容可能含有违反微信公众平台平台协议、相关法律法规和政策的内容",
  "62752": "可能含有具备安全风险的链接，请检查",
  "64004": "剩余定时群发数量不足或今天的群发数量已到，无法群发",
  "64501": "你输入的账号不存在，请重新输入",
  "64502": "你输入的微信号不存在，请重新输入",
  "64503": "1.接收预览消息的微信尚未关注公众号，请先扫码关注 2.如果已经关注公众号，请查看微信的隐私设置（在手机微信的【我->设置->隐私->添加我的方式】中），并开启【可通过以下方式找到我】的【手机号】、【微信号】、【qq号】，否则可能接收不到预览消息",
  "64504": "保存图文消息发送错误，请稍后再试",
  "64505": "发送预览失败，请稍后再试",
  "64506": "保存失败,链接不合法",
  "64507": "内容不能包含链接，请调整",
  "64508": "查看原文链接可能具备安全风险，请检查",
  "64509": "正文中不能包含超过10个视频,请重新编辑正文后再保存。",
  "64510": "内容不能包含音频，请调整",
  "64511": "内容不能包多个音频，请调整",
  "64512": "文章中音频错误,请使用音频添加按钮重新添加。",
  "64513": "封面必须存在正文中，请检查封面",
  "64515": "当前草稿非最新内容，请重新打开并编辑",
  "64520": "保存失败，包含了未发布的投票",
  "64522": "文章插入账号名片数超出上限",
  "64529": "正文只能包含一个投票",
  "64530": "保存失败，包含了不属于该账号的投票",
  "64550": "请勿插入不合法的已群发的图文消息链接",
  "64551": "请检查图文消息中的微视链接后重试。",
  "64552": "请检查阅读原文中的链接后重试。",
  "64553": "请不要在图文消息中插入超过5张卡券。请删减卡券后重试。",
  "64554": "在当前情况下不允许在图文消息中插入卡券，请删除卡券后重试。",
  "64555": "请检查图文消息卡片跳转的链接后重试。",
  "64556": "卡券不属于该公众号，请删除后重试",
  "64557": "公众号已不再支持下发优惠券，请删除后重试。",
  "64558": "请勿插入图文消息临时链接，链接会在短期失效",
  "64559": "请勿插入未群发的图文消息链接",
  "64563": "合集链接格式错误，请确认后重试",
  "64564": "含有不能被插入的账号，请删除后重试",
  "64566": "该账号暂时无法发送含有账号卡片的内容，请删除后重试",
  "64568": "含有小程序卡片的封面图域名不符合规范，请删除或更换",
  "64573": "添加的小程序链接不允许搜索或被封禁",
  "64601": "一篇文章只能插入一个广告卡片",
  "64602": "尚未开通文中广告位，但文章中有广告",
  "64603": "文中广告前不足300字",
  "64604": "文中广告后不足300字",
  "64605": "文中不能同时插入文中广告和互选广告",
  "64609": "包含了不合法的小商店商品卡片",
  "64701": "不是有效的账号原创文章链接",
  "64702": "标题超出64字长度限制",
  "64703": "摘要超出120字长度限制",
  "64704": "推荐语超出长度限制",
  "64705": "内容超出字数，请调整",
  "64712": "因原视频被删除，导致转载视频无法播放，请重新上传视频",
  "64713": "因原视频被取消原创，导致转载视频无法播放，请重新上传视频",
  "64717": "你所转载的原创文章已被删除，请备份内容后重试",
  "64721": "普通合集里不能包含付费合集",
  "64722": "付费合集id有误, 请重新选择",
  "64725": "此合集因违规被封，不支持付费",
  "65101": "图文模版数量已达到上限，请删除后再操作",
  "65211": "有部分视频号内容不可引用，请删除或者更换。",
  "65212": "有部分视频号内容不可引用，请删除或者更换。",
  "65213": "新发表动态暂时无法引用，请稍后重试",
  "65214": "预约已失效",
  "65215": "视频号活动已结束，请删除后重试",
  "65216": "视频号活动违规不可引用，请删除后重试",
  "65217": "视频号活动不可引用，请删除后重试",
  "65220": "音频已被删除，无法发表",
  "65221": "音频因违规无法发表",
  "65222": "因作者隐私设置，音频无法发表",
  "65223": "因作者隐私设置，音频无法发表",
  "65224": "音频审核中",
  "67008": "消息中可能含有具备安全风险的链接，请检查",
  "67010": "该图文消息部分文章正文为空，无法群发，请选择其他文章或编辑完整后再尝试",
  "67011": "设置的定时群发时间错误，请重新选择",
  "67012": "设置失败，定时时间与已有互选广告订单时间冲突",
  "67013": "设置失败，定时时间超过卡券有效期",
  "67014": "该时刻定时消息过多，请选择其他时刻",
  "67015": "所选视频状态异常，请重新选择或者前往视频素材库查看详情",
  "67016": "视频还在审核中，若审核失败则将无法播放",
  "67018": "你已设置过相同时间的定时消息，请到定时列表检查，避免重复操作。",
  "67019": "推荐语不能有违反公众平台协议、相关法律法规和政策的内容，请重新编辑",
  "67020": "赞赏账户授权失效或者状态异常",
  "67023": "内容不能包含外部链接, 请输入以http://和https://开头的公众号相关链接",
  "67024": "所选视频状态异常，请重新选择或者前往视频素材库查看详情",
  "67025": "所选视频状态异常，请重新选择或者前往视频素材库查看详情",
  "67031": "未审核通过的视频不能被使用",
  "67032": "含有审核失败的音频，请保存后删除或替换素材",
  "67033": "含有审核中的音频，请保存后等待审核通过再重试",
  "67034": "含有转码失败的音频，请保存后删除或替换素材",
  "67035": "含有转码中的音频，请保存后等待转码和审核通过再重试",
  "67036": "转码中、审核中、转码失败、审核失败及已下架的音频不支持发表，请保存后重试",
  "67037": "含有已下架的音频，请保存后删除或替换素材",
  "67043": "公益捐赠项目失效，请删除",
  "153010": "很抱歉，原创声明不成功|你的文章内容未达到声明原创的要求：文章文字字数（不包含标点符号和空格）不能过少，且自己创作的内容大于引用内容。说明：上述要求中，文章文字字数不包含标点符号和空格，请知悉。",
  "153012": "请设置转载类型",
  "154017": "请先绑定管理员再进行群发操作",
  "154020": "账号发表能力被封禁，无法发表",
  "155001": "本月发表付费文章已达10篇|每个月发送的付费文章最多10篇,本月你已超过限制数量,不能再发送付费文章",
  "200001": "图文内包含的音频已被删除，请重新添加。",
  "200002": "参数错误，请注意备份内容后重试",
  "200003": "session失效",
  "200008": "请输入验证码",
  "200013": "操作太频繁，请稍后再试",
  "200041": "此素材有文章存在违规，无法编辑",
  "200042": "图文中包含的小程序卡片不能多于20个",
  "200043": "图文中包含没有关联的小程序，请删除后再保存",
  "200046": "图文内含有不合法的音频，请重新上传后再次插入。",
  "200047": "标题中不能含有特殊字符",
  "200050": "文章插入视频号卡片数超出上限",
  "200051": "文章插入视频号卡片能力已被封禁",
  "202605": "账号付费功能被封禁期间不可群发付费内容",
  "202606": "请重新选择正确的价格",
  "202610": "账号未开通付费功能，不可群发付费内容",
  "202700": "保存失败，红包封面数据异常",
  "202701": "保存失败，每篇图文最多插入十款红包封面",
  "202702": "请删除红包封面后再保存",
  "202901": "文章插入直播间超过数量限制",
  "202902": "文章插入直播间失败",
  "202903": "没有权限插入直播间",
  "202905": "直播能力已被封禁，文章不能包含直播卡片",
  "202906": "文章插入直播间已过期",
  "203001": "文章插入读者讨论卡片数超出上限",
  "203002": "读者讨论能力已被封禁，文章不能包含读者讨论卡片",
  "203003": "尚未开通读者讨论功能，文章不能包含读者讨论卡片",
  "203009": "保存失败，读者讨论功能已暂停内测，请删除读者讨论插件后保存",
  "220001": "素材管理中的存储数量已达到上限，请删除后再操作。",
  "220002": "你的图片库已达到存储上限，请进行清理。",
  "320001": "该素材已被删除，无法保存",
  "342002": "含有未上架的小商店商品",
  "342003": "含有非公众号关联商店的商品",
  "353001": "文章内商品存在违规，请删除后群发",
  "360101": "该视频非公开可见，请更换视频",
  "442001": "账号新建/编辑素材能力已被封禁，暂不可使用。",
  "720002": "二维码已过期，请关闭弹窗重试群发",
  "720003": "操作繁忙",
  "720005": "请先绑定管理员再进行群发操作",
  "770001": "功能升级中，暂无法发布",
  "1530503": "请勿添加其他公众号的主页链接",
  "1530504": "请勿添加其他公众号的主页链接",
  "1530505": "请勿添加其他公众号的主页链接",
  "1530510": "链接已失效，请在手机端重新复制链接",
  "1530511": "链接已失效，请在手机端重新复制链接",
  "1530512": "链接已失效，请在手机端重新复制链接"
}

/**
 * 根据错误码获取错误信息
 * @param {number|string} code - 错误码
 * @param {string} defaultMsg - 默认错误信息
 * @returns {string} 错误信息
 */
export function getWechatErrorMessage(code, defaultMsg = '接口返回错误') {
  const codeStr = String(code)
  return WECHAT_ERROR_CODES[codeStr] || defaultMsg
}

// 导出错误码映射表供外部使用
export { WECHAT_ERROR_CODES }

/**
 * 从账号信息中获取认证数据（token 和 cookies）
 * @param {string|number} accountId - 账号ID
 * @returns {Object} { account, token, cookies }
 */
function getAccountAuth(accountId) {
  // 从 store 中获取账号信息
  const accountStore = useAccountStoreHook()
  const account = accountStore.getAccountById(accountId)

  // 从 account.auth_data 中获取 cookies 和 token
  let cookies = []
  let token = ''
  
  if (account.auth_data) {
    const authData = JSON.parse(account.auth_data)

    // 获取 token
    if (authData.token) {
      token = authData.token
    }

    // 获取 cookies
    if (authData.partition) {
      // 如果 auth_data 是序列化后的格式
      const partitionData = JSON.parse(authData.partition)
      cookies = partitionData.cookies || []
    } else if (authData.cookies) {
      // 如果直接包含 cookies
      cookies = authData.cookies
    }

  }


  return { account, token, cookies }
}

/**
 * 微信公众号统一请求封装
 * @param {Object} options - 请求配置
 * @param {string|number} options.accountId - 账号ID（自动获取认证信息，与 token/cookies 二选一）
 * @param {string} options.token - 微信token（与 accountId 二选一，需配合 cookies）
 * @param {Array} options.cookies - Cookie数组（与 accountId 二选一，需配合 token）
 * @param {string|Function} options.url - 请求URL，可以是字符串或函数 (token) => url
 * @param {string} options.method - 请求方法（GET/POST）
 * @param {Object|URLSearchParams|string|Function} options.body - 请求体，可以是对象/字符串或函数 (token) => body（可选）
 * @param {Object} options.headers - 额外的请求头（可选）
 * @param {boolean} options.checkBaseResp - 是否检查 base_resp（默认true）
 * @returns {Promise<Object>} 响应数据
 */
async function wechatRequest(options) {
  const {
    accountId,
    token: providedToken,
    cookies: providedCookies,
    url,
    method = 'GET',
    body,
    headers = {},
    checkBaseResp = true,
    requestId = null // 用于支持请求中止
  } = options

  // 获取认证信息
  let token, cookies
  if (accountId) {
    // 从账号信息中获取
    const auth = getAccountAuth(accountId)
    token = auth.token
    cookies = auth.cookies
  } else if (providedToken && providedCookies) {
    // 直接使用提供的 token 和 cookies
    token = providedToken
    cookies = providedCookies
  } else {
    throw new Error('必须提供 accountId 或 token+cookies')
  }

  // 构造最终的 URL
  const finalUrl = typeof url === 'function' ? url(token) : url

  // 构造最终的 body
  let finalBody
  if (body) {
    const bodyValue = typeof body === 'function' ? body(token) : body
    
    if (bodyValue instanceof URLSearchParams || typeof bodyValue === 'string') {
      finalBody = bodyValue.toString()
    } else {
      finalBody = new URLSearchParams(bodyValue).toString()
    }
  }

  // 构造默认请求头
  const defaultHeaders = {
    'Referer': 'https://mp.weixin.qq.com',
    'Cookie': cookiesToString(cookies),
    'User-Agent': USER_AGENT
  }

  // 如果是 POST 请求且没有指定 Content-Type，添加默认值
  if (method === 'POST' && !headers['Content-Type']) {
    defaultHeaders['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'
  }

  // 合并请求头
  const finalHeaders = { ...defaultHeaders, ...headers }

  // 发送请求
  const response = await window.electronAPI.http.fetch(finalUrl, {
    method,
    headers: finalHeaders,
    body: finalBody,
    requestId // 传递 requestId 以支持中止
  })

  // 检查响应状态
  if (!response.ok) {
    // 如果是请求被中止，抛出特殊错误
    if (response.aborted) {
      const error = new Error('请求已中止')
      error.aborted = true
      throw error
    }
    throw new Error(`API 请求失败: ${response.status} ${response.statusText || ''}`)
  }

  const data = response.data

  
  // 检查业务状态码
  if (checkBaseResp && data.base_resp?.ret !== 0) {
    const errorCode = data.base_resp?.ret
    const errorMsg = getWechatErrorMessage(errorCode, data.base_resp?.err_msg || '接口返回错误')
    console.log("微信接口返回错误", { code: errorCode, msg: errorMsg, data })
    const error = new Error(errorMsg)
    error.code = errorCode
    throw error
  }

  return data
}

/**
 * 获取微信公众号用户信息
 * @param {string} token - token字符串
 * @param {Array} cookies - Cookie数组
 * @returns {Promise<Object>} 用户信息数据
 */
export async function getWechatUserInfo(token, cookies) {
  //（未存入accountStore前，需要特殊处理）
    return await wechatRequest({
      token: token,
      cookies,
      url: (token) => `https://mp.weixin.qq.com/cgi-bin/safecenterstatus?action=protect&t=setting/safe-protect&token=${token}&lang=zh_CN&f=json`,
      method: 'GET'
    })
}

/**
 * 获取微信公众号系统通知
 * @param {string|number} accountId - 账号ID
 * @param {Object} params - 请求参数
 * @param {number} params.begin - 起始位置，默认0
 * @param {number} params.count - 获取数量，默认1
 * @param {number} params.status - 状态，默认0
 * @returns {Promise<Object>} 系统通知数据
 */
export async function getWechatSysNotify(accountId, params = {}) {
  const {
    begin = 0,
    count = 1,
    status = 0
  } = params

  return await wechatRequest({
    accountId,
    url: 'https://mp.weixin.qq.com/cgi-bin/sysnotify',
    method: 'POST',
    body: (token) => new URLSearchParams({
      token,
      lang: 'zh_CN',
      f: 'json',
      ajax: '1',
      random: Math.random().toString(),
      begin: begin.toString(),
      count: count.toString(),
      status: status.toString()
    })
  })
}

/**
 * 获取公众号草稿箱列表
 * @param {string|number} accountId - 账号ID
 * @param {Object} params - 请求参数
 * @param {string} params.query - 搜索关键词，默认为空
 * @param {number} params.begin - 起始位置，默认0
 * @param {number} params.count - 获取数量，默认10
 * @returns {Promise<Object>} 草稿箱列表数据
 */
export async function getWechatDraftList(accountId, params = {}) {
  const {
    query = '',
    begin = 0,
    count = 10
  } = params
  
  const data = await wechatRequest({
    accountId,
    url: (token) => `https://mp.weixin.qq.com/cgi-bin/appmsg?begin=${begin}&count=${count}&type=77&action=list_card&token=${token}&lang=zh_CN&f=json&query=${encodeURIComponent(query)}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    }
  })

  const fileCnt = data.app_msg_info?.file_cnt || {}
  
  return {
    success: true,
    items: data.app_msg_info?.item || [],
    file_cnt: fileCnt,
    total: fileCnt.draft_count || 0  // 草稿总数
  }
}

/**
 * 删除单个草稿
 * @param {string|number} accountId - 账号ID
 * @param {string|number} appmsgid - 要删除的草稿ID
 * @returns {Promise<Object>} 删除结果
 */
export async function deleteWechatDraft(accountId, appmsgid, requestId = null) {
  const data = await wechatRequest({
    accountId,
    url: 'https://mp.weixin.qq.com/cgi-bin/operate_appmsg?sub=del&t=ajax-response',
    method: 'POST',
    body: (token) => new URLSearchParams({
      token,
      lang: 'zh_CN',
      f: 'json',
      ajax: '1',
      AppMsgId: appmsgid
    }),
    requestId // 传递 requestId 以支持中止
  })
  
  return {
    success: true,
    appmsgid: data.appMsgId || appmsgid
  }
}

/**
 * 获取草稿详情
 * @param {string|number} accountId - 账号ID
 * @param {string|number} appmsgid - 文章ID
 * @returns {Promise<Object>} 草稿详情数据
 */
export async function getDraftDetail(accountId, appmsgid) {
  const timestamp = +new Date()
  
  const data = await wechatRequest({
    accountId,
    url: (token) => `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${appmsgid}&isMul=1&replaceScene=0&isSend=0&isFreePublish=0&token=${token}&lang=zh_CN&timestamp=${timestamp}&f=json`,
    method: 'GET'
  })
  
  console.log("获取文章详情接口结果",data);
  
  return {
    success: true,
    app_msg_info: JSON.parse(data.app_msg_info)
  }
}

/**
 * 操作草稿文章（创建或更新）
 * @param {string|number} accountId - 账号ID
 * @param {string} sub - 操作类型：'create' 创建，'update' 更新
 * @param {Object} params - 文章保存参数
 * @returns {Promise<Object>} 操作结果
 */
export async function operateWechatDraft(accountId, sub, params) {
  const data = await wechatRequest({
    accountId,
    url: (token) => `https://mp.weixin.qq.com/cgi-bin/operate_appmsg?t=ajax-response&sub=${sub}&type=77&token=${token}&lang=zh_CN`,
    method: 'POST',
    body: (token) => {
      // 添加 token 和基础参数
      return new URLSearchParams({
        token,
        lang: 'zh_CN',
        f: 'json',
        ajax: '1',
        ...params
      })
    }
  })
  
  return {
    success: true,
    appmsgid: data.appMsgId || data.appmsgid,
    data
  }
}

/**
 * 获取群发页面信息（包括群发次数、操作序列号、是否需要扫码等）
 * @param {string|number} accountId - 账号ID
 * @param {string|number} appmsgid - 草稿ID
 * @returns {Promise<Object>} 群发页面信息
 */
export async function getMasssendInfo(accountId, appmsgid) {
  const data = await wechatRequest({
    accountId,
    url: (token) => `https://mp.weixin.qq.com/cgi-bin/masssendpage?f=json&preview_appmsgid=${appmsgid}&token=${token}&lang=zh_CN&ajax=1`,
    method: 'GET'
  })
  
  // 解析群发次数列表
  const quotaItemList = data.quota_detail_list
    ?.find(v => v.quota_type === 'kQuotaTypeMassSendNormal')
    ?.quota_item_list || []
  
  // 解析用户标签/分组列表
  let contactGroupList = []
  if (data.contact_group_list) {
    try {
      const parsed = JSON.parse(data.contact_group_list)
      contactGroupList = parsed.group_info_list || []
    } catch (e) {
      console.error('解析用户标签失败:', e)
    }
  }
  
  // 解析是否需要扫码
  let needScanQrcode = true
  if (data.strategy_info) {
    try {
      const strategyInfo = JSON.parse(data.strategy_info)
      const protectStatus = strategyInfo.protect_status
      // 以下状态表示已关闭群发保护，无需扫码
      needScanQrcode = ![0, 1, 4, 5, 8, 9, 12, 13].includes(protectStatus)
    } catch (e) {
      console.error('解析群发保护状态失败:', e)
    }
  }
  
  return {
    success: true,
    quotaItemList, // 返回完整的次数列表，根据选择的日期获取对应次数
    operationSeq: data.operation_seq || '',
    needScanQrcode,
    contactGroupList,
    rawData: data
  }
}

/**
 * 获取国家地区列表
 * @param {string|number} accountId - 账号ID
 * @param {number} regionId - 地区ID，0=获取国家列表，其他值=获取子地区
 * @returns {Promise<Object>} 地区列表
 */
export async function getRegions(accountId, regionId = 0) {
  const data = await wechatRequest({
    accountId,
    url: `https://mp.weixin.qq.com/cgi-bin/getregions?t=setting/ajax-getregions&id=${regionId}&lang=zh_CN&f=json&ajax=1`,
    method: 'GET',
    checkBaseResp: false // 当没有子地区时返回 ret=1000000
  })
  
  // ret=1000000 或 data 为空表示没有子地区
  const hasChildren = data.base_resp?.ret === 0 && data.data && data.data.length > 0
  
  return {
    success: true,
    hasChildren,
    regions: data.data || [],
    total: data.num || 0
  }
}

/**
 * 检测文章原创
 * @param {string|number} accountId - 账号ID
 * @param {string|number} appmsgid - 草稿ID
 * @param {function} onProgress - 进度回调（可选）
 * @returns {Promise<Object>} 原创检测结果
 */
export async function checkAppmsgCopyright(accountId, appmsgid, onProgress) {
  // 获取认证信息
  const { token, cookies } = getAccountAuth(accountId)
  
  // 延时函数
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  
  // 发起检测请求
  async function doCheck(isFirstCheck) {
    const data = await wechatRequest({
      accountId,
      url: (token) => `https://mp.weixin.qq.com/cgi-bin/masssend?action=get_appmsg_copyright_stat&token=${token}&lang=zh_CN`,
      method: 'POST',
      body: (token) => new URLSearchParams({
        token,
        lang: 'zh_CN',
        f: 'json',
        ajax: '1',
        first_check: isFirstCheck ? '1' : '0',
        type: '10',
        appmsgid: String(appmsgid)
      }),
      checkBaseResp: false // 特殊返回码需要手动处理
    })
    return data
  }
  
  // 第一次请求
  let result = await doCheck(true)
  let retCode = result.base_resp?.ret
  
  // 轮询等待结果（最多10次，每次间隔1.2秒）
  const maxRetries = 10
  let retryCount = 0
  
  while (retCode === 154011 && retryCount < maxRetries) {
    // 154011 = 检测中
    if (onProgress) {
      onProgress({ status: 'checking', retry: retryCount + 1, maxRetries })
    }
    
    await sleep(1200)
    result = await doCheck(false)
    retCode = result.base_resp?.ret
    retryCount++
  }
  
  // 解析结果
  if (retCode === 154008) {
    // 命中原创
    let listData = { list: [] }
    if (result.list) {
      try {
        listData = JSON.parse(result.list)
      } catch (e) {
        console.error('解析原创列表失败:', e)
      }
    }
    return {
      success: true,
      copyright: 1,
      list: listData.list || [],
      listRaw: result.list || '',
      message: '命中原创，需要处理'
    }
  } else if (retCode === 154009) {
    // 未命中原创
    return {
      success: true,
      copyright: 0,
      list: [],
      listRaw: '',
      message: '未命中原创，可直接发表'
    }
  } else {
    // 其他错误
    throw new Error(`原创检测失败，错误码: ${retCode}`)
  }
}

/**
 * 发表文章到微信公众号
 * @param {string|number} accountId - 账号ID
 * @param {Object} params - 发表参数
 * @param {number} params.appmsgid - 草稿ID
 * @param {number} params.sendTime - 发表时间：0=立即，>0=定时(Unix时间戳秒)
 * @param {boolean} params.hasNotify - 是否发送群发通知
 * @param {boolean} params.isFreePublish - 是否免通知发表
 * @param {string} params.operationSeq - 操作序列号
 * @param {string} params.listRaw - 原创检测返回的list字段（JSON字符串）
 * @param {Object} params.reprintInfo - 原创转载信息
 * @param {number} params.appmsgItemCount - 文章数量
 * @param {string} params.code - 扫码验证码（可选）
 * @param {number} params.groupid - 用户标签分组ID（可选）
 * @param {number} params.sex - 性别筛选：-1=全部，1=男，2=女（可选）
 * @param {string} params.country - 国家（可选）
 * @param {string} params.province - 省份（可选）
 * @param {string} params.city - 城市（可选）
 * @returns {Promise<Object>} 发表结果
 */
export async function publishAppmsg(accountId, params) {
  const {
    appmsgid,
    sendTime = 0,
    hasNotify = true,
    isFreePublish = false,
    operationSeq,
    listRaw = '',
    reprintInfo = null,
    appmsgItemCount = 1,
    code = '',
    groupid,
    sex,
    country,
    province,
    city
  } = params
  
  const reqTime = Date.now()
  const isMulti = appmsgItemCount > 1 ? 1 : 0
  
  // 构建 reprint_info
  const reprintInfoStr = reprintInfo 
    ? JSON.stringify(reprintInfo)
    : JSON.stringify({ item_list: [] })
  
  // 构建表单数据
  const buildFormData = (token) => {
    const formParams = {
      token,
      lang: 'zh_CN',
      f: 'json',
      ajax: '1',
      random: String(Math.random()),
      ack: '',
      code: code || '',
      reprint_info: reprintInfoStr,
      reprint_confirm: '1',
      list: listRaw || '',
      send_time: String(sendTime),
      type: '10',
      share_page: '1',
      synctxweibo: '0',
      operation_seq: operationSeq,
      req_time: String(reqTime),
      sync_version: '1',
      isFreePublish: String(isFreePublish),
      appmsgid: String(appmsgid),
      isMulti: String(isMulti)
    }
    
    // 分组筛选参数
    if (groupid !== undefined && groupid !== null && groupid !== -1) {
      formParams.groupid = String(groupid)
    }
    if (sex !== undefined && sex !== null && sex !== -1) {
      formParams.sex = String(sex)
    }
    if (country) {
      formParams.country = country
    }
    if (province) {
      formParams.province = province
    }
    if (city) {
      formParams.city = city
    }
    
    return new URLSearchParams(formParams)
  }
  
  // 选择API URL
  const buildUrl = (token) => {
    let url = `https://mp.weixin.qq.com/cgi-bin/masssend?t=ajax-response&token=${token}&lang=zh_CN`
    
    if (sendTime > 0) {
      // 定时发表
      url += hasNotify ? '&action=time_send' : '&is_release_publish_page=1'
    } else {
      // 立即发表
      url += hasNotify ? '&is_release_publish_page=0' : '&is_release_publish_page=1'
    }
    
    console.log('[publishAppmsg] hasNotify:', hasNotify, 'isFreePublish:', isFreePublish, 'sendTime:', sendTime)
    console.log('[publishAppmsg] URL 参数:', url.includes('is_release_publish_page=1') ? '免通知' : (url.includes('action=time_send') ? '定时通知' : '立即通知'))
    
    return url
  }
  
  const data = await wechatRequest({
    accountId,
    url: buildUrl,
    method: 'POST',
    body: buildFormData
  })
  
  return {
    success: data.base_resp?.ret === 0,
    msg: data.base_resp?.err_msg || '',
    code: data.base_resp?.ret,
    data
  }
}

/**
 * 获取扫码验证的 ticket
 * @param {string|number} accountId - 账号ID
 * @param {string|number} appmsgid - 草稿ID
 * @returns {Promise<Object>} 包含 ticket 的结果
 */
export async function getQrcodeTicket(accountId, appmsgid) {
  const fingerprint = generateFingerprint()
  
  try {
    const data = await wechatRequest({
      accountId,
      url: (token) => `https://mp.weixin.qq.com/misc/safeassistant?1=1&token=${token}&lang=zh_CN`,
      method: 'POST',
      body: (token) => new URLSearchParams({
        token: String(token),
        lang: 'zh_CN',
        f: 'json',
        ajax: '1',
        fingerprint,
        random: String(Math.random()),
        action: 'get_ticket'
      }),
      checkBaseResp: false
    })
    
    if (!data) {
      return {
        success: false,
        error: '响应数据为空',
        ticket: null,
        data: null
      }
    }
    
    if (!data.ticket) {
      return {
        success: false,
        error: data.errmsg || '响应中没有 ticket 字段',
        ticket: null,
        data
      }
    }
    
    return {
      success: true,
      ticket: data.ticket,
      data
    }
  } catch (error) {
    console.error('[getQrcodeTicket] 请求失败:', error)
    return {
      success: false,
      error: error.message || '请求失败',
      ticket: null,
      data: null
    }
  }
}

/**
 * 获取扫码验证 UUID
 * @param {string|number} accountId - 账号ID
 * @param {string} ticket - 从 getQrcodeTicket 获取的 ticket
 * @returns {Promise<Object>} 包含 uuid 的结果
 */
export async function getQrcodeUuid(accountId, ticket) {
  const fingerprint = generateFingerprint()
  
  try {
    const data = await wechatRequest({
      accountId,
      url: (token) => `https://mp.weixin.qq.com/safe/safeqrconnect?1=1&token=${token}&lang=zh_CN`,
      method: 'POST',
      body: (token) => new URLSearchParams({
        token: String(token),
        lang: 'zh_CN',
        f: 'json',
        ajax: '1',
        fingerprint,
        random: String(Math.random()),
        state: '0',
        login_type: 'safe_center',
        type: 'json',
        ticket: String(ticket)
      }),
      checkBaseResp: false
    })
    
    // 检查返回数据
    if (!data) {
      return {
        success: false,
        error: '响应数据为空',
        uuid: null,
        data: null
      }
    }
    
    // 检查是否有 uuid
    if (!data.uuid) {
      return {
        success: false,
        error: data.errmsg || '响应中没有 uuid 字段',
        uuid: null,
        data
      }
    }
    
    return {
      success: true,
      uuid: data.uuid,
      data
    }
  } catch (error) {
    console.error('[getQrcodeUuid] 请求失败:', error)
    return {
      success: false,
      error: error.message || '请求失败',
      uuid: null,
      data: null
    }
  }
}

/**
 * 获取扫码验证二维码图片
 * @param {string|number} accountId - 账号ID
 * @param {Object} params - 参数
 * @param {string} params.ticket - 操作序列号
 * @param {string} params.uuid - UUID
 * @param {string} params.msgid - 消息ID（appmsgid）
 * @param {boolean} params.hasNotify - 是否发送群发通知
 * @returns {Promise<Object>} 包含图片 base64 的结果
 */
export async function getQrcodeImage(accountId, params) {
  const { ticket, uuid, msgid, hasNotify = true } = params
  const { token, cookies } = getAccountAuth(accountId)
  const ts = Date.now()
  
  // 构建 URL
  let url = `https://mp.weixin.qq.com/safe/safeqrcode?ticket=${encodeURIComponent(ticket)}&uuid=${uuid}&action=check&service_type=1&type=msgs&msgid=${msgid}`
  
  // 如果不发通知，添加 publish_type 参数
  if (!hasNotify) {
    url += '&publish_type=1'
  }
  
  // 使用 fetchImage 获取图片
  const response = await window.electronAPI.http.fetchImage(url, {
    headers: {
      'Referer': `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&reprint_confirm=0&timestamp=${ts}&type=77&appmsgid=${msgid}&token=${token}&lang=zh_CN`,
      'Cookie': cookiesToString(cookies)
    }
  })
  
  if (!response.ok) {
    throw new Error('获取二维码失败')
  }
  
  return {
    success: true,
    imageData: response.data // base64 图片数据
  }
}

/**
 * 查询扫码状态
 * @param {string|number} accountId - 账号ID
 * @param {Object} params - 参数
 * @param {string} params.uuid - UUID
 * @param {string} params.appmsgid - 文章ID
 * @returns {Promise<Object>} 扫码状态
 * - errcode: 401 = 未扫码, 404 = 已扫码, 405 = 确认, 403 = 取消
 */
export async function checkQrcodeStatus(accountId, params) {
  const { uuid, appmsgid } = params
  const fingerprint = generateFingerprint()
  const ts = Date.now()
  
  const data = await wechatRequest({
    accountId,
    url: (token) => `https://mp.weixin.qq.com/safe/safeuuid?timespam=${ts}&token=${token}&lang=zh_CN`,
    method: 'POST',
    body: (token) => new URLSearchParams({
      token,
      lang: 'zh_CN',
      f: 'json',
      ajax: '1',
      fingerprint,
      random: String(Math.random()),
      uuid,
      action: 'json',
      type: 'json'
    }),
    headers: {
      'Referer': `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&reprint_confirm=0&timestamp=${ts}&type=77&appmsgid=${appmsgid}&token=${appmsgid}&lang=zh_CN`
    },
    checkBaseResp: false
  })
  
  // 解析状态
  let status = 'unknown'
  let isValidate = false
  let msg = ''
  
  switch (data.errcode) {
    case 401:
      status = 'waiting'
      msg = '未扫码'
      break
    case 404:
      status = 'scanned'
      msg = '已扫码'
      break
    case 405:
      status = 'confirmed'
      isValidate = true
      msg = '扫码并确认'
      break
    case 403:
      status = 'cancelled'
      msg = '扫码并取消'
      break
    default:
      msg = `未知状态: ${data.errcode}`
  }
  
  return {
    success: true,
    errcode: data.errcode,
    status,
    isValidate,
    msg,
    data
  }
}

/**
 * 轮询查询扫码状态
 * @param {string|number} accountId - 账号ID
 * @param {Object} params - 参数
 * @param {string} params.uuid - UUID
 * @param {string} params.appmsgid - 文章ID
 * @param {number} params.timeout - 超时时间（秒），默认60
 * @param {number} params.interval - 轮询间隔（毫秒），默认1000
 * @param {function} params.onStatusChange - 状态变化回调
 * @param {function} params.getAbortSignal - 获取中止信号的函数
 * @returns {Promise<Object>} 最终状态
 */
export async function pollQrcodeStatus(accountId, params) {
  const {
    uuid,
    appmsgid,
    timeout = 60,
    interval = 1000,
    onStatusChange,
    getAbortSignal
  } = params
  
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  
  let count = 0
  const maxCount = Math.ceil((timeout * 1000) / interval)
  
  while (count < maxCount) {
    // 检查是否中止
    if (getAbortSignal && getAbortSignal()) {
      return {
        success: false,
        status: 'aborted',
        msg: '已取消'
      }
    }
    
    const result = await checkQrcodeStatus(accountId, { uuid, appmsgid })
    
    // 回调通知状态变化
    if (onStatusChange) {
      onStatusChange(result)
    }
    
    // 判断是否结束
    if (result.status === 'confirmed') {
      return {
        success: true,
        status: 'confirmed',
        isValidate: true,
        msg: '验证成功'
      }
    }
    
    if (result.status === 'cancelled') {
      return {
        success: false,
        status: 'cancelled',
        isValidate: false,
        msg: '已取消验证'
      }
    }
    
    count++
    await sleep(interval)
  }
  
  // 超时
  return {
    success: false,
    status: 'timeout',
    isValidate: false,
    msg: '超时，请点击刷新重试'
  }
}

/**
 * 生成32位随机指纹
 * @returns {string} 32位十六进制字符串
 */
function generateFingerprint() {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * 16)]
  }
  return result
}
