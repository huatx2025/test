# 项目分析报告

## 项目概述

**项目名称**: 编轻松自媒体编辑器
**版本**: 1.0.0
**作者**: jzl.com
**类型**: Electron 桌面应用程序

这是一个基于 Electron + Vue 3 开发的自媒体内容管理和发布工具，支持多平台账号管理、文章编辑和批量发布功能。

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 28.2.8 | 桌面应用框架 |
| Vue | 3.5.24 | 前端框架 |
| Ant Design Vue | 4.2.6 | UI组件库 |
| Vue Router | 4.6.3 | 路由管理 |
| Pinia | 3.0.4 | 状态管理 |
| Axios | 1.13.2 | HTTP请求 |
| Electron Updater | 6.7.3 | 自动更新 |
| Turndown | 7.2.2 | HTML转Markdown |
| Dayjs | 1.11.19 | 日期处理 |
| Sortablejs | 1.15.6 | 拖拽排序 |

---

## 项目结构

```
easydraft-editor/
├── src/
│   ├── main/                 # 主进程
│   │   ├── config/          # 配置文件（白名单）
│   │   ├── services/        # 服务模块
│   │   │   ├── article/    # 文章提取服务
│   │   │   ├── cookie/     # Cookie管理
│   │   │   ├── http/       # HTTP服务
│   │   │   ├── storage/    # 本地存储
│   │   │   ├── updater/    # 自动更新
│   │   │   └── window/     # 窗口管理
│   │   └── index.js        # 主进程入口
│   ├── preload/            # 预加载脚本
│   │   ├── index.js
│   │   └── webview-auth-preload.js
│   └── renderer/           # 渲染进程（Vue应用）
│       └── src/
│           ├── api/        # API接口
│           ├── assets/     # 静态资源
│           ├── components/ # 组件
│           ├── composables/# 组合式函数
│           ├── router/     # 路由
│           ├── store/      # 状态管理
│           ├── utils/      # 工具函数
│           └── views/      # 页面视图
├── build/                  # 构建资源
├── resources/              # 资源文件
└── electron-builder.yml    # 打包配置
```

---

## 核心功能模块

### 1. 用户认证系统
- **登录/注册**: 基于 JWT Token 的用户认证
- **Token刷新**: 应用启动时自动刷新Token
- **路由守卫**: 未登录自动跳转到登录页

### 2. 账号管理
- **多平台支持**: 微信公众号、小红书、抖音、微博、知乎、百家号、B站
- **分组管理**: 支持创建、编辑、删除分组
- **账号管理**: 添加、编辑、删除账号
- **排序功能**: 支持分组和账号的拖拽排序
- **状态管理**: 账号过期检测和失效处理

### 3. 草稿箱
- **文章管理**: 文章列表展示
- **批量操作**: 批量发布、批量删除
- **发布设置**: 版权设置、分组通知、定时发布
- **草稿卡片**: 文章预览和快速操作

### 4. 编辑器
- **文章编辑**: 富文本编辑功能
- **微信编辑器集成**: 集成微信公众号编辑器
- **文章创建**: 支持创建新文章

### 5. 多开面板
- **多账号管理**: 同时管理多个平台账号
- **Webview集成**: 内嵌各平台网页
- **浏览器工具栏**: 导航控制

### 6. 自动更新
- **版本检测**: 自动检测新版本
- **静默更新**: 后台下载更新包
- **更新服务器**: `https://static.dajiala.com:9224/static/gaoqingsong/bianqingsong`

---

## 状态管理

### User Store
- Token管理
- 用户信息管理
- 登录/登出状态

### Account Store
- 分组列表管理
- 账号列表管理
- 账号选择状态（草稿箱/多开面板）
- 分组和账号的CRUD操作
- 排序功能

---

## 主进程服务

| 服务 | 功能 |
|------|------|
| Window Service | 窗口创建和管理 |
| Cookie Service | Cookie读写 |
| HTTP Service | HTTP请求代理 |
| Storage Service | 本地存储 |
| Article Service | 文章提取 |
| Updater Service | 自动更新 |

---

## 路由结构

| 路径 | 名称 | 组件 | 认证要求 |
|------|------|------|----------|
| `/login` | Login | Auth/index.vue | 否 |
| `/` | MultiAccountPanel | MultiAccountPanel/index.vue | 是 |
| `/draft-box` | DraftBox | DraftBox/index.vue | 是 |
| `/editor` | Editor | Editor/index.vue | 是 |

---

## 构建和打包

### 开发命令
```bash
npm run dev          # 启动开发服务器
npm run dev:ps       # 启动开发服务器（UTF-8编码）
```

### 构建命令
```bash
npm run build        # 构建项目
npm run build:win    # 打包Windows版本
npm run build:mac    # 打包macOS版本
npm run build:linux  # 打包Linux版本
```

### 其他命令
```bash
npm run format       # 代码格式化
npm run lint         # 代码检查
```

---

## 特色功能

1. **Webview集成**: 内嵌各平台网页，支持直接在应用内操作
2. **Cookie同步**: 自动同步各平台的登录Cookie
3. **批量发布**: 支持一键发布到多个平台
4. **定时发布**: 支持设置文章定时发布
5. **分组通知**: 支持发布后群通知
6. **版权保护**: 支持文章版权声明设置
7. **CSP绕过**: 自动移除CSP响应头，允许加载外部资源

---

## API配置

- **基础URL**: `http://localhost:8000/api/v1` (可通过环境变量配置)
- **认证方式**: Bearer Token
- **超时时间**: 10秒

---

## 主题配置

```javascript
{
  colorPrimary: '#6666FF',    // 主色调
  colorSuccess: '#52c41a',    // 成功色
  colorWarning: '#faad14',    // 警告色
  colorError: '#ff4d4f',      // 错误色
  borderRadius: 6             // 圆角大小
}
```

---

## 支持的平台

根据资源文件和代码分析，支持以下平台：
- 微信公众号
- 小红书
- 抖音
- 微博
- 知乎
- 百家号
- B站
- 视频号

---

## 总结

这是一个功能完善的自媒体内容管理工具，采用现代化的技术栈，具有良好的架构设计。项目实现了从账号管理、内容编辑到多平台发布的完整工作流程，特别适合自媒体运营者使用。
