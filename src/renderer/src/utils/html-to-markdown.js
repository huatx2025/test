/**
 * HTML 转 Markdown 工具
 */
import TurndownService from 'turndown'

// 创建 turndown 实例
const turndownService = new TurndownService({
  headingStyle: 'atx',        // # 风格的标题
  codeBlockStyle: 'fenced',   // ``` 风格的代码块
  emDelimiter: '*',           // *斜体*
  strongDelimiter: '**',      // **加粗**
  bulletListMarker: '-',      // - 无序列表
})

// 自定义规则：处理微信文章中的图片（优先使用 data-src）
turndownService.addRule('wechatImage', {
  filter: 'img',
  replacement: (content, node) => {
    const src = node.getAttribute('data-src') || node.getAttribute('src') || ''
    const alt = node.getAttribute('alt') || ''
    if (!src) return ''
    return `![${alt}](${src})\n\n`
  }
})

// 处理 section 标签（微信文章常用）
turndownService.addRule('section', {
  filter: 'section',
  replacement: (content) => {
    const trimmed = content.trim()
    return trimmed ? trimmed + '\n\n' : ''
  }
})

// 移除空白 span
turndownService.addRule('emptySpan', {
  filter: (node) => {
    return node.nodeName === 'SPAN' && !node.textContent.trim()
  },
  replacement: () => ''
})

// 处理微信文章中的视频占位
turndownService.addRule('wechatVideo', {
  filter: (node) => {
    return node.nodeName === 'IFRAME' || 
           (node.classList && node.classList.contains('video_iframe'))
  },
  replacement: (content, node) => {
    const src = node.getAttribute('data-src') || node.getAttribute('src') || ''
    return `[视频](${src})\n\n`
  }
})

/**
 * 将 HTML 转换为 Markdown
 * @param {string} html - HTML 内容
 * @returns {string} Markdown 内容
 */
export function htmlToMarkdown(html) {
  if (!html) return ''
  
  // 预处理：清理微信文章中的一些特殊内容
  let cleanHtml = html
    .replace(/<br\s*\/?>/gi, '\n')   // 换行符
    .replace(/&nbsp;/g, ' ')          // 空格
    .replace(/<!--[\s\S]*?-->/g, '')  // 移除注释
  
  try {
    const markdown = turndownService.turndown(cleanHtml)
    // 后处理：清理多余空行
    return markdown
      .replace(/\n{3,}/g, '\n\n')  // 多个空行合并为两个
      .trim()
  } catch (error) {
    console.error('HTML 转 Markdown 失败:', error)
    return html // 转换失败时返回原内容
  }
}
