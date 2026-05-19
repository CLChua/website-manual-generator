const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const configPath = process.argv[2] || './config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const SCREENSHOT_DIR = path.resolve(config.output.screenshotDir);
const OUTPUT_DIR = path.resolve('.');

function getImagePath(fileName) {
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  return fs.existsSync(filePath) ? filePath : null;
}

function getScreenshotsByPrefix(prefix) {
  return fs.readdirSync(SCREENSHOT_DIR)
    .filter(f => f.includes(prefix) && f.endsWith('.png'))
    .sort();
}

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';
pptx.author = config.site.name;
pptx.company = config.site.name;
pptx.subject = '后台管理系统介绍';
pptx.title = config.site.name;

// Master slide
pptx.defineSlideMaster({
  title: 'MASTER_SLIDE',
  background: { color: 'FFFFFF' },
  objects: [
    { rect: { x: 0, y: 0, w: '100%', h: 0.75, fill: { color: '1E3A5F' } } },
    { text: { text: config.site.name, options: { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 24, color: 'FFFFFF', bold: true } } },
    { rect: { x: 0, y: 5.25, w: '100%', h: 0.5, fill: { color: '1E3A5F' } } },
    { text: { text: config.site.version, options: { x: 0.5, y: 5.3, w: 9, h: 0.4, fontSize: 12, color: 'FFFFFF' } } },
  ],
});

// Title slide
let slide = pptx.addSlide();
slide.background = { color: '1E3A5F' };
slide.addText(config.site.name, { x: 1, y: 1.5, w: 8, h: 1, fontSize: 48, color: 'FFFFFF', bold: true, align: 'center' });
slide.addText('系统功能介绍', { x: 1, y: 2.5, w: 8, h: 1, fontSize: 36, color: 'FFD700', bold: true, align: 'center' });
slide.addText(`版本：${config.site.version}`, { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 16, color: 'CCCCCC', align: 'center' });

// Overview
slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
slide.addText('系统概述', { x: 0.5, y: 1, w: 9, h: 0.6, fontSize: 28, color: '1E3A5F', bold: true });
slide.addText(`${config.site.name} 后台管理系统，访问地址：${config.site.url}`, { x: 0.5, y: 1.7, w: 9, h: 1, fontSize: 18 });
const dashImgs = getScreenshotsByPrefix('04_dashboard');
if (dashImgs.length) slide.addImage({ path: getImagePath(dashImgs[0]), x: 0.5, y: 2.5, w: 9, h: 2.5 });

// Login
slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
slide.addText('登录信息', { x: 0.5, y: 1, w: 9, h: 0.6, fontSize: 28, color: '1E3A5F', bold: true });
slide.addText(`账号：${config.credentials.username}\n密码：${config.credentials.password}`, { x: 0.5, y: 1.7, w: 4, h: 1.5, fontSize: 20 });
const loginImgs = getScreenshotsByPrefix('01_login_page');
if (loginImgs.length) slide.addImage({ path: getImagePath(loginImgs[0]), x: 5, y: 1.2, w: 4.5, h: 2.5 });

// Modules overview
slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
slide.addText('功能模块', { x: 0.5, y: 1, w: 9, h: 0.6, fontSize: 28, color: '1E3A5F', bold: true });
let row = 0, col = 0;
for (const mod of config.modules) {
  const x = 0.5 + col * 2.2;
  const y = 1.8 + row * 0.7;
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 2, h: 0.6, fill: { color: 'F0F4F8' }, line: { color: '1E3A5F', width: 1 } });
  slide.addText(mod.name, { x, y, w: 2, h: 0.6, fontSize: 16, color: '1E3A5F', bold: true, align: 'center' });
  col++;
  if (col >= 4) { col = 0; row++; }
}

// Feature slides for each module (up to 8 modules with screenshots)
for (let i = 0; i < Math.min(config.modules.length, 10); i++) {
  const mod = config.modules[i];
  const safeName = mod.name.replace(/[^\w一-龥]/g, '_');
  const mainImgs = getScreenshotsByPrefix(`${safeName}_main`);

  slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slide.addText(mod.name, { x: 0.5, y: 1, w: 9, h: 0.6, fontSize: 28, color: '1E3A5F', bold: true });

  if (mainImgs.length) {
    slide.addImage({ path: getImagePath(mainImgs[0]), x: 0.5, y: 1.7, w: 9, h: 3.3 });
  } else {
    slide.addText('该模块功能说明', { x: 0.5, y: 1.7, w: 9, h: 3, fontSize: 18 });
  }
}

// Summary
slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
slide.addText('总结', { x: 0.5, y: 1, w: 9, h: 0.6, fontSize: 28, color: '1E3A5F', bold: true });
slide.addText(
  `${config.site.name} 后台管理系统\n` +
  `共包含 ${config.modules.length} 个核心功能模块\n` +
  `访问地址：${config.site.url}`,
  { x: 0.5, y: 1.8, w: 9, h: 2, fontSize: 22, align: 'center' }
);

const outputPath = path.join(OUTPUT_DIR, config.output.pptName);
pptx.writeFile({ fileName: outputPath })
  .then(() => console.log(`PPT生成成功: ${outputPath}`))
  .catch(err => console.error('PPT生成失败:', err));
