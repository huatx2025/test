# 编轻松自媒体编辑器

## GitHub Actions 自动构建

本项目已配置 GitHub Actions 自动构建，支持 Windows 和 macOS 平台。

### 工作流说明

工作流文件位于：`.github/workflows/build.yml`

#### 触发条件：
- 推送到 `main` 或 `master` 分支
- 创建以 `v` 开头的标签（如 `v1.0.1`）
- 手动触发（在 GitHub Actions 页面）
- Pull Request

#### 构建平台：
- ✅ Windows (windows-latest)
- ✅ macOS (macos-latest)

### 如何推送代码到 GitHub

#### 方法 1：使用 HTTPS（推荐）

```bash
# 设置远程仓库为 HTTPS
git remote set-url origin https://github.com/huatx2025/test.git

# 推送代码
git push -u origin main
```

推送时会提示输入 GitHub 用户名和密码（或 Personal Access Token）。

#### 方法 2：使用 SSH

```bash
# 设置远程仓库为 SSH
git remote set-url origin git@github.com:huatx2025/test.git

# 推送代码
git push -u origin main
```

需要先配置 SSH 密钥。

### 查看构建结果

推送成功后，访问：
- **Actions 页面**：https://github.com/huatx2025/test/actions
- 点击最新的工作流运行查看构建进度
- 构建完成后可以下载生成的安装包

### 创建发布版本

要创建正式发布版本并自动上传到 GitHub Releases：

```bash
# 创建标签
git tag v1.0.1

# 推送标签
git push origin v1.0.1
```

这将触发构建并自动创建 Release，包含 Windows 和 macOS 的安装包。

### 手动触发构建

1. 访问 https://github.com/huatx2025/test/actions
2. 点击左侧的 "Build and Release" 工作流
3. 点击右上角的 "Run workflow" 按钮
4. 选择分支并点击 "Run workflow"

### 构建产物

#### Windows:
- `easydraft-editor-1.0.1-setup.exe` - 安装程序
- `easydraft-editor-1.0.1-setup.exe.blockmap` - 增量更新文件
- `latest.yml` - 更新配置

#### macOS:
- `easydraft-editor-1.0.1.dmg` - 磁盘镜像
- `easydraft-editor-1.0.1.dmg.blockmap` - 增量更新文件
- `latest-mac.yml` - 更新配置

### 本地构建命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建 Windows 版本
npm run build:win

# 构建 macOS 版本
npm run build:mac

# 构建 Linux 版本
npm run build:linux
```

## 项目信息

- **项目名称**: 编轻松自媒体编辑器
- **版本**: 1.0.1
- **GitHub**: https://github.com/huatx2025/test
- **官网**: https://a.jzl.com

## 技术栈

- Electron 28.2.8
- Vue 3.5.24
- Ant Design Vue 4.2.6
- Vite 5.2.8
- Pinia 3.0.4

## 许可证

请查看项目许可证文件。

