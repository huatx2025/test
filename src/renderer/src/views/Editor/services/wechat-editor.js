/**
 * 微信公众号编辑器服务模块
 * 用于在渲染进程中通过 webview.executeJavaScript 操作微信编辑器
 *
 * 注意：所有与微信编辑器的交互都通过 webview.executeJavaScript 实现
 * 不再使用 preload 脚本
 */

// ==================== 文章数据解析 ====================

/**
 * 解析提取的文章原始数据
 * @param {Object} rawData - 原始文章数据
 * @param {Object} options - 解析选项
 * @param {boolean} options.clearSourceUrl - 是否清除原文链接
 * @returns {Object} 解析后的文章数据
 */
export function parseArticleData(rawData, options = {}) {
  const {
    title = '',
    author = '',
    source_url = '',
    content_noencode = '',  // HTML正文
    content_text = '',      // 纯文本
    cdn_url = '',           // 封面图
    nick_name = '',         // 公众号名称
    item_show_type = 0,     // 内容类型: 0-图文 5-视频 8-图集 10-音频
    desc = '',
    cdn_235_1_url = '',    // 2.35:1 比例封面
    cdn_16_9_url = '',     // 16:9 比例封面
    cdn_3_4_url = '',      // 3:4 比例封面
    cdn_1_1_url = ''       // 1:1 比例封面
  } = rawData

  // 处理原文链接
  let finalSourceUrl = source_url
  if (options.clearSourceUrl) {
    finalSourceUrl = ''
    console.log('%c已清除原文链接', 'color: #6666FF;')
  }

  // 优化封面图选择策略：优先使用主封面，如果没有则尝试其他比例
  let finalCoverUrl = cdn_url
  if (!finalCoverUrl) {
    finalCoverUrl = cdn_16_9_url || cdn_3_4_url || cdn_1_1_url || cdn_235_1_url
    if (finalCoverUrl) {
      console.log('%c使用备用封面图:', 'color: #FF9900;', finalCoverUrl)
    }
  }

  // 验证封面图 URL 格式
  if (finalCoverUrl && !isValidImageUrl(finalCoverUrl)) {
    console.warn('%c封面图 URL 格式可能无效:', 'color: #FF9900;', finalCoverUrl)
  }

  return {
    title,
    author,
    source_url: finalSourceUrl,
    content: content_noencode,
    description: content_text,
    digest: desc,
    cover_url: finalCoverUrl,
    publisher: nick_name,
    content_type: item_show_type,
    // 保存所有封面图 URL，供后续使用
    cover_urls: {
      main: cdn_url,
      ratio_235_1: cdn_235_1_url,
      ratio_16_9: cdn_16_9_url,
      ratio_3_4: cdn_3_4_url,
      ratio_1_1: cdn_1_1_url
    }
  }
}

/**
 * 验证图片 URL 是否有效
 * @param {string} url - 图片 URL
 * @returns {boolean} 是否有效
 */
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false
  
  try {
    const urlObj = new URL(url)
    const validProtocols = ['http:', 'https:']
    if (!validProtocols.includes(urlObj.protocol)) return false
    
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    const hasValidExtension = validExtensions.some(ext => url.toLowerCase().includes(ext))
    
    return hasValidExtension || url.includes('cdn') || url.includes('image')
  } catch {
    return false
  }
}

/**
 * 生成检测编辑器是否有内容的JS代码
 * @returns {string} JavaScript代码
 */
export function generateCheckEditorContentCode() {
  return `
    (function() {
      // 检查标题
      const titleElement = document.getElementById('title');
      const hasTitle = titleElement && titleElement.value.trim() !== '';

      // 检查正文
      const contentElement = document.querySelector('.ProseMirror');
      const hasContent = contentElement && contentElement.textContent.trim() !== '从这里开始写正文';

      return hasTitle || hasContent;
    })();
  `
}

/**
 * 生成设置富文本正文内容的JS代码
 * @param {string} content - HTML内容
 * @returns {string} JavaScript代码
 */
export function generateSetContentCode(content) {
  const escapedContent = JSON.stringify(content)
  return `
    (function() {
      const el = document.querySelector('.ProseMirror');
      if (!el) {
        console.warn('未找到 rich_media_content 元素');
        return false;
      }
      el.innerHTML = ${escapedContent};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('%c正文内容已填充', 'color: #6666FF;');
      return true;
    })();
  `
}

/**
 * 生成设置标题的JS代码
 * @param {string} title - 标题文本
 * @returns {string} JavaScript代码
 */
export function generateSetTitleCode(title) {
  const escapedTitle = JSON.stringify(title)
  return `
    (function() {
      const titleElement = document.getElementById('title');
      if (!titleElement) {
        console.warn('%c未找到标题输入框元素', 'color: orange;');
        return false;
      }
      titleElement.value = ${escapedTitle};
      const events = ['input', 'change', 'blur'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        titleElement.dispatchEvent(event);
      });
      console.log('%c标题已填充:', 'color: #6666FF;', ${escapedTitle});
      return true;
    })();
  `
}

/**
 * 生成设置作者的JS代码
 * @param {string} author - 作者名称
 * @returns {string} JavaScript代码
 */
export function generateSetAuthorCode(author) {
  const escapedAuthor = JSON.stringify(author)
  return `
    (function() {
      const authorElement = document.getElementById('author');
      if (!authorElement) {
        console.warn('%c未找到作者输入框元素', 'color: orange;');
        return false;
      }
      authorElement.value = ${escapedAuthor};
      const events = ['input', 'change', 'blur'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        authorElement.dispatchEvent(event);
      });
      console.log('%c作者已填充:', 'color: #6666FF;', ${escapedAuthor});
      return true;
    })();
  `
}

/**
 * 生成等待 JSAPI 就绪的JS代码
 * @param {number} maxWaitTime - 最大等待时间（毫秒）
 * @returns {string} JavaScript代码
 */
export function generateWaitForJSAPICode(maxWaitTime = 5000) {
  return `
    (function() {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
          if (window.__MP_Editor_JSAPI__) {
            clearInterval(checkInterval);
            console.log('%cJSAPI 已就绪', 'color: #6666FF;');
            resolve(true);
          } else if (Date.now() - startTime > maxWaitTime) {
            clearInterval(checkInterval);
            console.error('%cJSAPI 等待超时', 'color: red;');
            resolve(false);
          }
        }, 100);
      });
    })();
  `
}

/**
 * 生成设置封面图的JS代码（优化版）
 * @param {string} coverUrl - 封面图片URL
 * @param {number} maxRetries - 最大重试次数
 * @returns {string} JavaScript代码
 */
export function generateSetCoverCode(coverUrl, maxRetries = 3) {
  const escapedCoverUrl = JSON.stringify(coverUrl)
  return `
    (function() {
      const coverUrl = ${escapedCoverUrl};
      const maxRetries = ${maxRetries};
      
      return new Promise(async (resolve, reject) => {
        // 等待 JSAPI 就绪
        const apiReady = await (function() {
          return new Promise((resolve) => {
            const startTime = Date.now();
            const checkInterval = setInterval(() => {
              if (window.__MP_Editor_JSAPI__) {
                clearInterval(checkInterval);
                resolve(true);
              } else if (Date.now() - startTime > 5000) {
                clearInterval(checkInterval);
                resolve(false);
              }
            }, 100);
          });
        })();
        
        if (!apiReady) {
          console.error('%cJSAPI 未就绪，无法设置封面', 'color: red;');
          resolve({ success: false, error: 'JSAPI 未就绪' });
          return;
        }
        
        let retryCount = 0;
        
        const trySetCover = () => {
          return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
              resolve({ success: false, error: '设置超时' });
            }, 10000);
            
            window.__MP_Editor_JSAPI__.invoke({
              apiName: "mp_editor_change_cover",
              apiParam: {
                oriImgUrl: coverUrl
              },
              sucCb: function () {
                clearTimeout(timeoutId);
                console.log('%c封面图设置成功:', 'color: #6666FF;', coverUrl);
                resolve({ success: true });
              },
              errCb: function (error) {
                clearTimeout(timeoutId);
                console.error('%c封面图设置失败:', 'color: red;', error);
                resolve({ success: false, error: error || '未知错误' });
              }
            });
          });
        };
        
        while (retryCount < maxRetries) {
          const result = await trySetCover();
          
          if (result.success) {
            resolve(result);
            return;
          }
          
          retryCount++;
          if (retryCount < maxRetries) {
            console.log('%c封面图设置失败，进行第', 'color: #FF9900;', retryCount, '次重试...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        resolve({ success: false, error: '重试次数已达上限', retryCount });
      });
    })();
  `
}

/**
 * 生成设置摘要的JS代码
 * @param {string} digest - 摘要文本
 * @returns {string} JavaScript代码
 */
export function generateSetDigestCode(digest) {
  const escapedDigest = JSON.stringify(digest.slice(0, 120))
  return `
    (function() {
      const digestElement = document.getElementById('js_description');
      if (!digestElement) {
        console.warn('%c未找到摘要输入框元素', 'color: orange;');
        return false;
      }
      digestElement.value = ${escapedDigest};
      const events = ['input', 'change', 'blur'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        digestElement.dispatchEvent(event);
      });
      console.log('%c摘要已填充:', 'color: #6666FF;', ${escapedDigest});
      return true;
    })();
  `
}

/**
 * 生成设置原文链接的JS代码
 * @param {string} sourceUrl - 原文链接URL
 * @returns {string} JavaScript代码
 */
export function generateSetSourceUrlCode(sourceUrl) {
  const escapedSourceUrl = JSON.stringify(sourceUrl)
  return `
    (function() {
      const sourceUrlElement = document.getElementById('js_sourceurl');
      if (!sourceUrlElement) {
        console.warn('%c未找到原文链接输入框元素', 'color: orange;');
        return false;
      }
      sourceUrlElement.value = ${escapedSourceUrl};
      const events = ['input', 'change', 'blur'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        sourceUrlElement.dispatchEvent(event);
      });
      console.log('%c原文链接已填充:', 'color: #6666FF;', ${escapedSourceUrl});
      return true;
    })();
  `
}

/**
 * 生成创建新文章的JS代码
 * @returns {string} JavaScript代码
 */
export function generateCreateNewArticleCode() {
  return `
    (function() {
      const createBtn = document.querySelector('.js_create_article[data-type="0"]');
      if (createBtn) {
        createBtn.click();
        console.log('%c已点击创建文章按钮', 'color: #6666FF;');
        return true;
      } else {
        console.error('%c未找到创建文章按钮', 'color: red;');
        return false;
      }
    })();
  `
}

/**
 * 通过 webview 执行填充文章数据
 * @param {Object} webview - webview组件实例（需要有executeJavaScript方法）
 * @param {Object} articleData - 文章数据
 * @returns {Promise<void>}
 */
export async function fillArticleToEditor(webview, articleData) {
  console.log('%c开始填充文章数据到编辑器', 'color: #6666FF;', articleData)

  const executeJS = (code) => webview.executeJavaScript(code)

  // 1. 设置标题
  if (articleData.title) {
    await executeJS(generateSetTitleCode(articleData.title))
  }

  // 2. 设置作者
  if (articleData.author) {
    await executeJS(generateSetAuthorCode(articleData.author))
  }

  // 3. 设置正文内容
  if (articleData.content) {
    await executeJS(generateSetContentCode(articleData.content))
  }

  // 4. 设置封面（优化版：支持重试、备用封面图和错误处理）
  if (articleData.cover_url) {
    let coverResult = await executeJS(generateSetCoverCode(articleData.cover_url))
    
    // 如果主封面设置失败，尝试使用备用封面图
    if (!coverResult || !coverResult.success) {
      console.error('%c主封面图设置失败:', 'color: red;', coverResult?.error || '未知错误')
      
      // 尝试备用封面图
      const backupUrls = [
        articleData.cover_urls?.ratio_16_9,
        articleData.cover_urls?.ratio_3_4,
        articleData.cover_urls?.ratio_1_1,
        articleData.cover_urls?.ratio_235_1
      ].filter(url => url && url !== articleData.cover_url)
      
      for (const backupUrl of backupUrls) {
        console.log('%c尝试备用封面图:', 'color: #FF9900;', backupUrl)
        coverResult = await executeJS(generateSetCoverCode(backupUrl))
        
        if (coverResult && coverResult.success) {
          console.log('%c备用封面图设置成功', 'color: #6666FF;')
          break
        }
      }
      
      // 如果所有封面图都失败，记录警告但不中断流程
      if (!coverResult || !coverResult.success) {
        console.warn('%c所有封面图均设置失败，跳过封面设置', 'color: #FF9900;')
      }
    }
  }

  // 5. 设置摘要
  if (articleData.digest) {
    await executeJS(generateSetDigestCode(articleData.digest))
  }

  // 6. 设置原文链接（如果有值才设置，空字符串表示已清除）
  if (articleData.source_url) {
    await executeJS(generateSetSourceUrlCode(articleData.source_url))
  }

  console.log('%c文章数据填充完成', 'color: #6666FF;')
}

/**
 * 检查编辑器是否有内容
 * @param {Object} webview - webview组件实例
 * @returns {Promise<boolean>}
 */
export async function checkEditorHasContent(webview) {
  return await webview.executeJavaScript(generateCheckEditorContentCode())
}

/**
 * 创建新文章并填充数据
 * @param {Object} webview - webview组件实例
 * @param {Object} articleData - 文章数据
 * @returns {Promise<void>}
 */
export async function createNewArticleAndFill(webview, articleData) {
  console.log('%c创建新文章', 'color: #6666FF;')

  const success = await webview.executeJavaScript(generateCreateNewArticleCode())

  if (success) {
    // 延迟1秒后填充数据
    await new Promise(resolve => setTimeout(resolve, 1000))
    await fillArticleToEditor(webview, articleData)
  } else {
    throw new Error('未找到创建文章按钮')
  }
}

// ==================== 编辑器页面初始化 ====================

/**
 * 生成检查是否在微信公众号编辑页面的JS代码
 * @returns {string} JavaScript代码
 */
export function generateCheckIsEditPageCode() {
  return `
    (function() {
      const url = window.location.href;
      const isCorrectPath = url.includes('https://mp.weixin.qq.com/cgi-bin/appmsg');
      const hasEditAction = url.includes('action=edit');
      return isCorrectPath && hasEditAction;
    })();
  `
}

/**
 * 生成删除指定元素的JS代码
 * @param {string} className - 要删除的元素类名
 * @returns {string} JavaScript代码
 */
export function generateRemoveElementCode(className) {
  const escapedClassName = JSON.stringify(className)
  return `
    (function() {
      const element = document.querySelector('.' + ${escapedClassName});
      if (element) {
        element.remove();
        console.log('%c已清除元素: ' + ${escapedClassName}, 'color: #6666FF;');
        return true;
      }
      return false;
    })();
  `
}

/**
 * 生成激活创建按钮菜单的JS代码（触发hover初始化以加载创建新文章的DOM）
 * @returns {string} JavaScript代码
 */
export function generateActivateCreateMenuCode() {
  return `
    (function() {
      const btn = document.getElementById('js_add_appmsg');
      if (btn) {
        // 触发 hover 初始化
        btn.dispatchEvent(
          new MouseEvent('mouseover', {
            bubbles: true,
            view: window
          })
        );
        // 立刻移走
        btn.dispatchEvent(
          new MouseEvent('mouseout', {
            bubbles: true,
            view: window
          })
        );
        console.log('%c已激活创建按钮菜单', 'color: #6666FF;');
        return true;
      }
      return false;
    })();
  `
}

/**
 * 生成添加同步按钮的JS代码
 * 点击按钮时会通过 console.log 输出特殊格式的消息，供父组件监听
 * @returns {string} JavaScript代码
 */
export function generateAddSyncButtonCode() {
  return `
    (function() {
      const submitSpan = document.getElementById('js_submit');
      if (!submitSpan) {
        console.log('%c未找到提交按钮，无法添加同步按钮', 'color: #FF6666;');
        return false;
      }

      // 检查是否已存在同步按钮
      if (document.getElementById('js_sync_other_account')) {
        console.log('%c同步按钮已存在', 'color: #6666FF;');
        return true;
      }

      // 创建外层 span
      const syncSpan = document.createElement('span');
      syncSpan.id = 'js_sync_other_account';
      syncSpan.className = 'btn btn_input btn_default r';

      syncSpan.style.borderRadius = '4px';
      syncSpan.style.fontSize = '14px';
      syncSpan.style.minWidth = '96px';
      syncSpan.style.height = '34px';
      syncSpan.style.display = 'inline-block';

      // 创建 button
      const button = document.createElement('button');
      button.type = 'button';

      const text = document.createElement('span');
      text.className = 'send_wording';
      text.innerText = '同步到其他账号';

      button.appendChild(text);
      syncSpan.appendChild(button);

      // 插入到"保存为草稿"左边
      submitSpan.parentNode.insertBefore(syncSpan, submitSpan);

      // 从URL获取appmsgid的辅助函数
      function getAppmsgIdFromUrl() {
        const url = window.location.href;
        let appmsgid = null;

        // 方法1: 使用 URLSearchParams
        try {
          const urlParams = new URLSearchParams(window.location.search);
          appmsgid = urlParams.get('appmsgid');
        } catch (e) {
          console.log('URLSearchParams 解析失败:', e);
        }

        // 方法2: 使用正则表达式匹配
        if (!appmsgid) {
          const match = url.match(/appmsgid=(\\d+)/);
          if (match) {
            appmsgid = match[1];
          }
        }

        return appmsgid;
      }

      // 检查是否正在保存中
      function isSaving() {
        const saveBtn = document.getElementById('js_submit');
        if (!saveBtn) return false;
        const sendWording = saveBtn.querySelector('.send_wording');
        if (!sendWording) return false;
        // display: none 表示正在保存中
        return sendWording.style.display === 'none' || getComputedStyle(sendWording).display === 'none';
      }

      // 触发保存草稿并等待完成
      function saveDraftAndWait() {
        return new Promise((resolve, reject) => {
          const saveBtn = document.getElementById('js_submit');
          if (!saveBtn) {
            reject(new Error('未找到保存草稿按钮'));
            return;
          }

          // 查找按钮内的实际button元素
          const actualBtn = saveBtn.querySelector('button') || saveBtn;

          console.log('%c正在保存草稿...', 'color: #6666FF;');
          actualBtn.click();

          // 等待保存完成：监听 .send_wording 的 display 变化
          let checkCount = 0;
          const maxChecks = 60; // 最多检查60次，每次500ms，共30秒

          const checkInterval = setInterval(() => {
            checkCount++;

            // 检查保存是否完成（display 变为 inline）
            const sendWording = saveBtn.querySelector('.send_wording');
            const isComplete = sendWording &&
              (sendWording.style.display === 'inline' || getComputedStyle(sendWording).display === 'inline');

            if (isComplete) {
              clearInterval(checkInterval);
              // 再等待一小段时间确保URL已更新
              setTimeout(() => {
                const appmsgid = getAppmsgIdFromUrl();
                console.log('%c草稿保存成功，appmsgid:', 'color: #6666FF;', appmsgid);
                // 输出特殊格式消息，供父组件监听保存草稿成功事件
                console.log('[EASYDRAFT:save-draft-success]' + JSON.stringify({ appmsgid }));
                resolve(appmsgid);
              }, 500);
            } else if (checkCount >= maxChecks) {
              clearInterval(checkInterval);
              reject(new Error('保存草稿超时，请手动保存后重试'));
            }
          }, 500);
        });
      }

      // 点击事件 - 通过 console.log 输出特殊格式的消息，供父组件监听
      button.addEventListener('click', async function () {
        const url = window.location.href;
        console.log('%c当前URL:', 'color: #6666FF;', url);

        // 如果正在保存中，提示用户等待
        if (isSaving()) {
          alert('正在保存中，请稍候...');
          return;
        }

        // 禁用按钮，防止重复点击
        button.disabled = true;
        text.innerText = '保存中...';

        try {
          // 先触发保存草稿
          console.log('%c先保存草稿...', 'color: #6666FF;');
          const appmsgid = await saveDraftAndWait();

          if (appmsgid) {
            // 输出特殊格式消息，供父组件监听
            console.log('[EASYDRAFT:sync-to-other-account]' + JSON.stringify({ appmsgid }));
          } else {
            console.log('%c保存成功但未获取到草稿ID，可能是新建文章', 'color: #FF9900;');
          }
        } catch (error) {
          console.error('保存草稿失败:', error.message);
        } finally {
          // 恢复按钮状态
          button.disabled = false;
          text.innerText = '同步到其他账号';
        }
      });

      // 监听原生"保存为草稿"按钮的点击事件
      const saveBtn = document.getElementById('js_submit');
      if (saveBtn) {
        const actualSaveBtn = saveBtn.querySelector('button') || saveBtn;
        
        actualSaveBtn.addEventListener('click', async function () {
          console.log('%c检测到原生保存为草稿按钮被点击', 'color: #6666FF;');
          
          // 等待保存完成
          let checkCount = 0;
          const maxChecks = 60;
          
          const checkInterval = setInterval(() => {
            checkCount++;
            
            const sendWording = saveBtn.querySelector('.send_wording');
            const isComplete = sendWording &&
              (sendWording.style.display === 'inline' || getComputedStyle(sendWording).display === 'inline');
            
            if (isComplete) {
              clearInterval(checkInterval);
              // 再等待一小段时间确保URL已更新
              setTimeout(() => {
                const appmsgid = getAppmsgIdFromUrl();
                console.log('%c原生保存草稿成功，appmsgid:', 'color: #6666FF;', appmsgid);
                // 输出特殊格式消息，供父组件监听保存草稿成功事件
                console.log('[EASYDRAFT:save-draft-success]' + JSON.stringify({ appmsgid }));
              }, 500);
            } else if (checkCount >= maxChecks) {
              clearInterval(checkInterval);
            }
          }, 500);
        });
      }

      // 监听原生"发表"按钮的点击事件
      const publishBtn = document.getElementById('js_send');
      if (publishBtn) {
        const actualPublishBtn = publishBtn.querySelector('button') || publishBtn;
        
        actualPublishBtn.addEventListener('click', async function () {
          console.log('%c检测到原生发表按钮被点击', 'color: #6666FF;');
          // 输出特殊格式消息，供父组件监听发表事件
          console.log('[EASYDRAFT:publish-success]' + JSON.stringify({}));
        });
      }

      console.log('%c已添加同步按钮', 'color: #6666FF;');
      return true;
    })();
  `
}

/**
 * 生成设置 MutationObserver 监听 DOM 变化的JS代码
 * 用于自动删除动态加载的元素
 * @returns {string} JavaScript代码
 */
export function generateSetupMutationObserverCode() {
  return `
    (function() {
      // 避免重复设置
      if (window.__easydraft_observer__) {
        return true;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector('.weui-desktop-online-faq__wrp');
        if (element) {
          element.remove();
          console.log('%c已清除元素: weui-desktop-online-faq__wrp', 'color: #6666FF;');
        }
      });

      // 开始观察整个文档的变化
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      window.__easydraft_observer__ = observer;
      console.log('%c已设置 MutationObserver', 'color: #6666FF;');
      return true;
    })();
  `
}

/**
 * 初始化微信编辑器页面
 * 执行以下操作：
 * 1. 删除 FAQ 元素
 * 2. 激活创建按钮菜单
 * 3. 添加同步按钮
 * 4. 设置 MutationObserver 监听 DOM 变化
 *
 * @param {Object} webview - webview组件实例
 * @returns {Promise<boolean>} 是否初始化成功
 */
export async function initWechatEditorPage(webview) {
  const executeJS = (code) => webview.executeJavaScript(code)

  try {
    // 检查是否在编辑页面
    const isEditPage = await executeJS(generateCheckIsEditPageCode())
    if (!isEditPage) {
      console.log('当前页面非微信公众号编辑页面，跳过初始化')
      return false
    }

    console.log('%c编轻松公众号编辑器插件初始化', 'color: #6666FF; font-size: 16px; font-weight: bold;')

    // 删除 FAQ 元素
    await executeJS(generateRemoveElementCode('weui-desktop-online-faq__wrp'))

    // 设置 MutationObserver 监听 DOM 变化
    await executeJS(generateSetupMutationObserverCode())

    // 延迟执行以下操作，等待 DOM 完全加载
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 激活创建按钮菜单
    await executeJS(generateActivateCreateMenuCode())

    // 添加同步按钮
    await executeJS(generateAddSyncButtonCode())

    console.log('%c编轻松编辑器插件已激活', 'color: #6666FF; font-weight: bold;')
    return true
  } catch (error) {
    console.error('初始化微信编辑器页面失败:', error)
    return false
  }
}

/**
 * 删除指定元素
 * @param {Object} webview - webview组件实例
 * @param {string} className - 要删除的元素类名
 * @returns {Promise<boolean>}
 */
export async function removeElement(webview, className) {
  return await webview.executeJavaScript(generateRemoveElementCode(className))
}

/**
 * 添加同步按钮
 * @param {Object} webview - webview组件实例
 * @returns {Promise<boolean>}
 */
export async function addSyncButton(webview) {
  return await webview.executeJavaScript(generateAddSyncButtonCode())
}

// ==================== URL 解析工具 ====================

/**
 * 从URL中提取appmsgid
 * @param {string} url - 微信编辑器URL
 * @returns {string|null} appmsgid 或 null
 */
export function extractAppmsgIdFromUrl(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.searchParams.get('appmsgid')
  } catch {
    return null
  }
}

/**
 * 解析同步消息
 * @param {string} message - console 消息
 * @returns {Object|null} 解析后的消息对象，包含 appmsgid；如果不是同步消息则返回 null
 */
export function parseSyncMessage(message) {
  const prefix = '[EASYDRAFT:sync-to-other-account]'
  if (message && message.startsWith(prefix)) {
    try {
      const jsonStr = message.slice(prefix.length)
      return JSON.parse(jsonStr)
    } catch {
      return null
    }
  }
  return null
}

/**
 * 解析保存草稿成功消息
 * @param {string} message - console 消息
 * @returns {Object|null} 解析后的消息对象，包含 appmsgid；如果不是保存草稿成功消息则返回 null
 */
export function parseSaveDraftMessage(message) {
  const prefix = '[EASYDRAFT:save-draft-success]'
  if (message && message.startsWith(prefix)) {
    try {
      const jsonStr = message.slice(prefix.length)
      return JSON.parse(jsonStr)
    } catch {
      return null
    }
  }
  return null
}

/**
 * 解析发表成功消息
 * @param {string} message - console 消息
 * @returns {Object|null} 解析后的消息对象；如果不是发表成功消息则返回 null
 */
export function parsePublishMessage(message) {
  const prefix = '[EASYDRAFT:publish-success]'
  if (message && message.startsWith(prefix)) {
    try {
      const jsonStr = message.slice(prefix.length)
      return JSON.parse(jsonStr)
    } catch {
      return null
    }
  }
  return null
}

// ==================== AI 排版相关 ====================

/**
 * 生成获取编辑器富文本内容的JS代码
 * @returns {string} JavaScript代码
 */
export function generateGetContentCode() {
  return `
    (function() {
      const el = document.querySelector('.ProseMirror');
      if (!el) {
        console.warn('未找到 ProseMirror 编辑器元素');
        return null;
      }
      return el.innerHTML;
    })();
  `
}

/**
 * 生成获取编辑器标题的JS代码
 * @returns {string} JavaScript代码
 */
export function generateGetTitleCode() {
  return `
    (function() {
      const titleElement = document.getElementById('title');
      if (!titleElement) {
        console.warn('未找到标题输入框元素');
        return '';
      }
      return titleElement.value;
    })();
  `
}

/**
 * 获取编辑器富文本内容
 * @param {Object} webview - webview组件实例
 * @returns {Promise<string|null>} HTML内容
 */
export async function getEditorContent(webview) {
  return await webview.executeJavaScript(generateGetContentCode())
}

/**
 * 获取编辑器标题
 * @param {Object} webview - webview组件实例
 * @returns {Promise<string>} 标题文本
 */
export async function getEditorTitle(webview) {
  return await webview.executeJavaScript(generateGetTitleCode())
}

/**
 * 设置编辑器富文本内容
 * @param {Object} webview - webview组件实例
 * @param {string} content - HTML内容
 * @returns {Promise<boolean>}
 */
export async function setEditorContent(webview, content) {
  return await webview.executeJavaScript(generateSetContentCode(content))
}
