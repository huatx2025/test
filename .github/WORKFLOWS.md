# GitHub Actions 工作流说明

本项目包含三个 GitHub Actions 工作流，用于自动化构建和发布流程。

## 工作流文件

### 1. `build.yml` - 基础构建工作流

**触发条件：**
- 推送到 `main` 或 `master` 分支
- 推送标签（以 `v` 开头）
- Pull Request 到 `main` 或 `master` 分支
- 手动触发

**功能：**
- 在 Windows、macOS 和 Linux 上构建应用
- 上传构建产物为 artifacts
- 当推送标签时自动创建 GitHub Release

### 2. `release.yml` - 正式发布工作流

**触发条件：**
- 推送版本标签（格式：`v*.*.*`，例如 `v1.0.1`）

**功能：**
- 在三个平台上构建生产版本
- 支持代码签名（需配置 secrets）
- 自动创建 GitHub Release 并上传安装包
- 生成发布说明

### 3. `ci.yml` - 持续集成工作流

**触发条件：**
- 推送到 `main`、`master` 或 `develop` 分支
- Pull Request 到这些分支

**功能：**
- 在多个 Node.js 版本（18, 20）和操作系统上测试
- 运行代码检查（linter）
- 构建应用以验证代码
- 构建开发版本并上传（仅 Windows）

## 使用方法

### 发布新版本

1. 更新 `package.json` 中的版本号
2. 提交更改：
   ```bash
   git add package.json
   git commit -m "chore: bump version to 1.0.2"
   ```
3. 创建并推送标签：
   ```bash
   git tag v1.0.2
   git push origin v1.0.2
   ```
4. GitHub Actions 会自动构建并创建 Release

### 手动触发构建

1. 进入 GitHub 仓库的 Actions 页面
2. 选择 "Build and Release" 工作流
3. 点击 "Run workflow" 按钮
4. 选择分支并运行

### 查看构建产物

1. 进入 GitHub 仓库的 Actions 页面
2. 点击相应的工作流运行记录
3. 在页面底部的 "Artifacts" 部分下载构建产物

## 配置代码签名（可选）

### macOS 代码签名

在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加以下 secrets：

- `MAC_CERTS`: Base64 编码的 .p12 证书文件
- `MAC_CERTS_PASSWORD`: 证书密码
- `APPLE_ID`: Apple ID 邮箱
- `APPLE_ID_PASSWORD`: App-specific password

然后在 `release.yml` 中取消注释相关环境变量。

### Windows 代码签名

添加以下 secrets：

- `WIN_CSC_LINK`: Base64 编码的 .pfx 证书文件
- `WIN_CSC_KEY_PASSWORD`: 证书密码

并在 `release.yml` 中添加相应的环境变量。

## 构建输出

### Windows
- `easydraft-editor-{version}-setup.exe` - 安装程序
- `latest.yml` - 自动更新配置文件

### macOS
- `easydraft-editor-{version}.dmg` - DMG 安装包
- `latest-mac.yml` - 自动更新配置文件

### Linux
- `easydraft-editor-{version}.AppImage` - AppImage 格式
- `easydraft-editor-{version}.deb` - Debian/Ubuntu 包
- `easydraft-editor-{version}.rpm` - RedHat/Fedora 包
- `latest-linux.yml` - 自动更新配置文件

## 注意事项

1. 确保 `package.json` 中的 `repository.url` 正确配置
2. 首次运行可能需要在 GitHub 仓库设置中启用 Actions
3. macOS 构建需要较长时间，请耐心等待
4. 如果不需要某个平台的构建，可以在工作流文件中删除相应的配置

## 故障排查

### 构建失败
- 检查 Actions 日志中的错误信息
- 确保所有依赖都在 `package.json` 中正确声明
- 验证 Node.js 版本兼容性

### 发布失败
- 确保标签格式正确（`v*.*.*`）
- 检查 `GITHUB_TOKEN` 权限
- 验证 `electron-builder.yml` 配置

### 代码签名失败
- 验证证书是否过期
- 检查 secrets 是否正确配置
- 确保证书格式正确（Base64 编码）

