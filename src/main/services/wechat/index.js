import { ipcMain, BrowserWindow } from 'electron'

class WechatService {
  constructor() {
    this.loginWindow = null
    this.checkInterval = null
    this.fingerprint = '64f379b133f5d29df7b2d4d72faf8812'
  }

  /**
   * Register IPC handlers
   */
  registerIpcHandlers() {
    ipcMain.on('toMain', async (event, data) => {
      if (data && data.tag) {
        switch (data.tag) {
          case 'wechat:createLoginViewInDialog':
            await this.createLoginWindow(event)
            break
          case 'wechat:loadAccount':
            await this.loadAccount(event, data.data)
            break
          case 'wechat:cleanupCountdown':
            this.cleanup()
            break
        }
      }
    })
  }

  /**
   * Load account (inject cookies and navigate to WeChat platform)
   */
  async loadAccount(event, accountData) {
    try {
      const { token, cookies } = accountData
      
      const wechatUrl = `https://mp.weixin.qq.com/cgi-bin/home?t=home/index&lang=zh_CN&token=${token}`
      
      event.sender.send('fromMain', {
        tag: 'wechat:loadAccountUrl',
        data: {
          url: wechatUrl,
          cookies: cookies
        }
      })
      
    } catch (error) {
      // Ignore error
    }
  }

  /**
   * Create hidden login window
   */
  async createLoginWindow(event) {
    try {
      if (this.loginWindow && !this.loginWindow.isDestroyed()) {
        this.loginWindow.destroy()
      }

      this.loginWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true
        }
      })

      const cookiesToClear = ['slave_user', 'slave_sid', 'slave_bizuin', 'data_bizuin', 'bizuin', 'data_ticket', 'rand_info', 'token']
      for (const cookieName of cookiesToClear) {
        await this.loginWindow.webContents.session.cookies.remove('https://mp.weixin.qq.com', cookieName)
      }

      this.loginWindow.webContents.once('did-finish-load', async () => {
        try {
          await this.injectQRCodePage(event)
          this.startCheckLogin(event)
        } catch (error) {
          event.sender.send('fromMain', {
            tag: 'wechat:loginFailed',
            data: {
              error: error.message || 'Generate QR code failed'
            }
          })
        }
      })

      await this.loginWindow.loadURL('https://mp.weixin.qq.com/')

    } catch (error) {
      event.sender.send('fromMain', {
        tag: 'wechat:loginFailed',
        data: {
          error: error.message || 'Create login window failed'
        }
      })
    }
  }

  /**
   * Inject QR code login page
   */
  async injectQRCodePage(event) {
    try {
      if (!this.loginWindow || this.loginWindow.isDestroyed()) {
        throw new Error('Login window destroyed')
      }

      await this.loginWindow.webContents.executeJavaScript(`
        (async function() {
          try {
            const preloginUrl = 'https://mp.weixin.qq.com/cgi-bin/bizlogin?action=prelogin&fingerprint=64f379b133f5d29df7b2d4d72faf8812&token=&lang=zh_CN&f=json&ajax=1';
            const response = await fetch(preloginUrl, {
              method: 'POST',
              credentials: 'include'
            });
            const result = await response.json();
            return { success: true, data: result };
          } catch (e) {
            return { success: false, error: e.message };
          }
        })();
      `)

      if (!this.loginWindow || this.loginWindow.isDestroyed()) {
        throw new Error('Login window destroyed after prelogin')
      }

      await this.loginWindow.webContents.executeJavaScript(`
        (async function() {
          try {
            const startloginUrl = 'https://mp.weixin.qq.com/cgi-bin/bizlogin?action=startlogin';
            const sessionid = ${Date.now()};
            const body = 'userlang=zh_CN&redirect_url=&login_type=3&sessionid=' + sessionid + '&fingerprint=64f379b133f5d29df7b2d4d72faf8812&token=&lang=zh_CN&f=json&ajax=1';
            const response = await fetch(startloginUrl, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: body
            });
            const result = await response.json();
            return { success: true, data: result };
          } catch (e) {
            return { success: false, error: e.message };
          }
        })();
      `)

      if (!this.loginWindow || this.loginWindow.isDestroyed()) {
        throw new Error('Login window destroyed after startlogin')
      }

      const qrcodeResult = await this.loginWindow.webContents.executeJavaScript(`
        (async function() {
          try {
            document.body.innerHTML = \`
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5; margin: 0; padding: 0; font-family: Arial, sans-serif;">
                <div style="background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                  <h2 style="color: #333; margin-bottom: 20px;">WeChat Official Account Login</h2>
                  <img id="qrcode" alt="QR Code" style="max-width: 300px; max-height: 300px; border: 1px solid #eee; display: none; margin: 0 auto;" />
                  <p id="status" style="margin-top: 20px; color: #07c160;">Loading QR code...</p>
                </div>
              </div>
            \`;

            const qrcodeUrl = 'https://mp.weixin.qq.com/cgi-bin/scanloginqrcode?action=getqrcode&random=' + Date.now();
            
            const response = await fetch(qrcodeUrl, {
              method: 'GET',
              credentials: 'include'
            });
            
            const arrayBuffer = await response.arrayBuffer();
            
            const blob = new Blob([arrayBuffer], { type: 'image/png' });
            
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = function() {
                const base64 = reader.result;
                
                const img = document.getElementById('qrcode');
                const status = document.getElementById('status');
                
                img.onload = function() {
                  status.textContent = 'Please scan QR code with WeChat';
                  img.style.display = 'block';
                  resolve({ success: true, qrcode: base64 });
                };
                img.onerror = function(e) {
                  status.textContent = 'QR code load failed';
                  status.style.color = 'red';
                  resolve({ success: false, error: 'Image load failed' });
                };
                img.src = base64;
              };
              reader.onerror = function(e) {
                resolve({ success: false, error: 'FileReader failed' });
              };
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            return { success: false, error: e.message };
          }
        })();
      `)

      if (!this.loginWindow || this.loginWindow.isDestroyed()) {
        throw new Error('Login window destroyed after getting QR code')
      }

      if (qrcodeResult.success) {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('fromMain', {
            tag: 'wechat:qrcodeReady',
            data: {
              qrcode: qrcodeResult.qrcode
            }
          })
        }
      } else {
        throw new Error('QR code generation failed: ' + (qrcodeResult.error || 'Unknown error'))
      }

    } catch (error) {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('fromMain', {
          tag: 'wechat:loginFailed',
          data: {
            error: error.message || 'Generate QR code failed'
          }
        })
      }
      throw error
    }
  }

  /**
   * Start polling to check login status
   */
  startCheckLogin(event) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    let checkCount = 0
    const maxChecks = 300
    let scanDetected = false

    this.checkInterval = setInterval(async () => {
      checkCount++

      if (checkCount > maxChecks) {
        clearInterval(this.checkInterval)
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send('fromMain', {
            tag: 'wechat:statusUpdate',
            data: {
              status: 'QR code expired, please reopen'
            }
          })
        }
        return
      }

      try {
        if (!this.loginWindow || this.loginWindow.isDestroyed()) {
          clearInterval(this.checkInterval)
          this.checkInterval = null
          return
        }

        const cookies = await this.loginWindow.webContents.session.cookies.get({ domain: 'mp.weixin.qq.com' })
        const slaveUserCookie = cookies.find(c => c.name === 'slave_user')
        const slaveSidCookie = cookies.find(c => c.name === 'slave_sid')

        if (!scanDetected && !slaveSidCookie) {
          try {
            const askLoginResult = await this.loginWindow.webContents.executeJavaScript(`
              (async function() {
                try {
                  const askloginUrl = 'https://mp.weixin.qq.com/cgi-bin/bizlogin?action=asklogin&token=&lang=zh_CN&f=json&ajax=1';
                  const response = await fetch(askloginUrl, {
                    method: 'POST',
                    credentials: 'include'
                  });
                  const result = await response.json();
                  return result;
                } catch (e) {
                  return null;
                }
              })();
            `).catch(() => null)

            if (askLoginResult && askLoginResult.status) {
              if (askLoginResult.status === 1 && !scanDetected) {
                scanDetected = true
                if (event.sender && !event.sender.isDestroyed()) {
                  event.sender.send('fromMain', {
                    tag: 'wechat:scanSuccess',
                    data: {}
                  })
                }
              } else if (askLoginResult.status === 4) {
                clearInterval(this.checkInterval)
                this.checkInterval = null
                if (event.sender && !event.sender.isDestroyed()) {
                  event.sender.send('fromMain', {
                    tag: 'wechat:statusUpdate',
                    data: {
                      status: 'QR code expired, refreshing...'
                    }
                  })
                }
                return
              }
            }
          } catch (error) {
            // Ignore check error
          }
        }

        if (slaveUserCookie && slaveSidCookie && slaveUserCookie.value !== 'EXPIRED') {
          clearInterval(this.checkInterval)
          this.checkInterval = null

          await this.handleLoginSuccess(event, cookies)
        }
      } catch (error) {
        // Ignore check error
      }
    }, 1000)
  }

  /**
   * Handle login success
   */
  async handleLoginSuccess(event, cookies) {
    try {
      if (!this.loginWindow || this.loginWindow.isDestroyed()) {
        return
      }

      const slaveUserCookie = cookies.find(c => c.name === 'slave_user')
      const tokenCookie = cookies.find(c => c.name === 'token')
      const originalUsername = slaveUserCookie ? slaveUserCookie.value : ''
      let token = tokenCookie ? tokenCookie.value : ''

      const navigationPromise = new Promise((resolve) => {
        const checkNavigation = setInterval(() => {
          if (!this.loginWindow || this.loginWindow.isDestroyed()) {
            clearInterval(checkNavigation)
            resolve(false)
            return
          }
          
          const currentURL = this.loginWindow.webContents.getURL()
          
          if (currentURL.includes('mp.weixin.qq.com/cgi-bin/home')) {
            clearInterval(checkNavigation)
            resolve(true)
          }
        }, 100)
        
        setTimeout(() => {
          clearInterval(checkNavigation)
          resolve(false)
        }, 5000)
      })
      
      const navigated = await navigationPromise
      
      if (!this.loginWindow || this.loginWindow.isDestroyed()) {
        return
      }
      
      let userInfo = { nickname: 'Unnamed Account', avatar: '' }
      
      try {
        const currentURL = this.loginWindow.webContents.getURL()
        
        if (currentURL.includes('mp.weixin.qq.com/cgi-bin/home')) {
          const urlParams = new URLSearchParams(new URL(currentURL).search)
          const urlToken = urlParams.get('token')
          if (urlToken) {
            token = urlToken
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        userInfo = await this.loginWindow.webContents.executeJavaScript(`
          (function() {
            let nickname = null;
            let avatarUrl = null;
            
            if (window.wx && window.wx.data) {
              nickname = window.wx.data.nick_name || window.wx.data.nickname;
              avatarUrl = window.wx.data.head_img || window.wx.data.headimg;
            }
            
            if (!nickname) {
              const selectors = [
                '.account_name',
                '.weui-desktop-account__name',
                '.account_setting_item_title'
              ];
              
              for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el) {
                  const text = el.textContent.trim();
                  if (text && text.length > 0) {
                    nickname = text;
                    break;
                  }
                }
              }
            }
            
            if (!avatarUrl) {
              const avatarSelectors = [
                '.account_avatar img',
                '.weui-desktop-account__avatar img'
              ];
              
              for (const selector of avatarSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                  avatarUrl = el.src;
                  break;
                }
              }
            }
            
            return {
              nickname: nickname || 'Unnamed Account',
              avatar: avatarUrl || ''
            };
          })();
        `).catch(e => {
          return { nickname: 'Unnamed Account', avatar: '' }
        })
      } catch (error) {
        // Ignore error
      }

      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('fromMain', {
          tag: 'wechat:loginSuccess',
          data: {
            name: userInfo.nickname,
            avatar: userInfo.avatar,
            token: token,
            originalUsername: originalUsername,
            cookies: cookies.map(c => `${c.name}=${c.value}`).join('; '),
            isUpdate: false
          }
        })
      }

      if (this.loginWindow && !this.loginWindow.isDestroyed()) {
        this.loginWindow.destroy()
        this.loginWindow = null
      }
      
      setTimeout(() => {
        if (event.sender && !event.sender.isDestroyed()) {
          this.createLoginWindow(event).catch(err => {
            // Ignore error
          })
        }
      }, 500)

    } catch (error) {
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send('fromMain', {
          tag: 'wechat:loginFailed',
          data: {
            error: error.message || 'Get account info failed'
          }
        })
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    if (this.loginWindow && !this.loginWindow.isDestroyed()) {
      this.loginWindow.destroy()
      this.loginWindow = null
    }
  }
}

// 创建单例
const wechatService = new WechatService()

export default wechatService
