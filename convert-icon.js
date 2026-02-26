const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico').default;

// 使用 logo.png 作为源
const sourcePng = 'logo.png';

async function convert() {
  try {
    console.log('开始转换 logo.png...\n');

    // 检查源文件是否存在
    if (!fs.existsSync(sourcePng)) {
      console.error('错误: logo.png 不存在');
      return;
    }

    // 生成各种尺寸的 PNG
    const sizes = [512, 256, 128, 64, 48, 32, 16];
    
    for (const size of sizes) {
      await sharp(sourcePng)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(`build/icon-${size}.png`);
      console.log(`✓ PNG ${size}x${size} 已生成: build/icon-${size}.png`);
    }

    // 复制一份作为主 icon.png (256x256)
    await sharp(sourcePng)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('build/icon.png');
    console.log('✓ 主图标已生成: build/icon.png');

    // 生成 ICO 文件 (用于 Windows)
    // 使用 256x256 的 PNG 生成 ICO
    const icoBuffer = await pngToIco('build/icon-256.png');
    fs.writeFileSync('build/icon.ico', icoBuffer);
    console.log('✓ ICO 图标已生成: build/icon.ico');

    // 复制到 resources 目录
    await sharp(sourcePng)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('resources/icon.png');
    console.log('✓ 资源图标已生成: resources/icon.png');

    // 复制到 renderer assets
    await sharp(sourcePng)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile('src/renderer/src/assets/logo.png');
    console.log('✓ 前端资源已生成: src/renderer/src/assets/logo.png');

    console.log('\n========================================');
    console.log('✓ 所有图标已生成完成！');
    console.log('========================================');
    console.log('\n包含:');
    console.log('- PNG 各尺寸图标 (build/icon-*.png)');
    console.log('- ICO 图标 (build/icon.ico) - Windows 打包使用');
    console.log('- 提示: ICNS 格式可使用 https://cloudconvert.com/png-to-icns 转换');
  } catch (err) {
    console.error('转换失败:', err);
  }
}

convert();
