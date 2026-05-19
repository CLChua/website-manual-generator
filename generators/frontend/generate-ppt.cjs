const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const configPath = process.argv[2] || './config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const SCREENSHOT_DIR = path.resolve(config.output?.screenshotDir || './screenshots');
const OUTPUT_DIR = path.resolve('.');

// Load page info
let pageInfo = null;
const infoPath = path.join(path.dirname(configPath), 'page-info.json');
if (fs.existsSync(infoPath)) {
  pageInfo = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
}

function getImagePath(fileName) {
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  return fs.existsSync(filePath) ? filePath : null;
}

let pages = [];
if (pageInfo && pageInfo.pages) {
  pages = pageInfo.pages;
} else {
  const files = fs.readdirSync(SCREENSHOT_DIR)
    .filter(f => f.endsWith('.png'))
    .sort();
  for (const f of files) {
    const match = f.match(/^\d+_(.+?)\.png$/);
    if (match) {
      pages.push({
        name: match[1].replace(/_/g, '/'),
        title: match[1].replace(/_/g, ''),
        file: f,
      });
    }
  }
}

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_16x9';
pptx.author = config.site.name;
pptx.company = config.site.name;
pptx.subject = '网站前台介绍';
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
slide.addText('网站前台介绍', { x: 1, y: 2.5, w: 8, h: 1, fontSize: 36, color: 'FFD700', bold: true, align: 'center' });
slide.addText(`版本：${config.site.version}`, { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 16, color: 'CCCCCC', align: 'center' });

// Overview
slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
slide.addText('网站概述', { x: 0.5, y: 1, w: 9, h: 0.6, fontSize: 28, color: '1E3A5F', bold: true });
slide.addText(`网站地址：${config.site.url}\n共包含 ${pages.length} 个页面`, { x: 0.5, y: 1.7, w: 9, h: 1, fontSize: 18 });

// Pages overview
slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
slide.addText('页面概览', { x: 0.5, y: 1, w: 9, h: 0.6, fontSize: 28, color: '1E3A5F', bold: true });

let row = 0, col = 0;
for (const p of pages.slice(0, 16)) {
  const x = 0.5 + col * 2.2;
  const y = 1.8 + row * 0.7;
  slide.addShape(pptx.ShapeType.rect, { x, y, w: 2, h: 0.6, fill: { color: 'F0F4F8' }, line: { color: '1E3A5F', width: 1 } });
  slide.addText(p.name, { x, y, w: 2, h: 0.6, fontSize: 14, color: '1E3A5F', bold: true, align: 'center' });
  col++;
  if (col >= 4) { col = 0; row++; }
}

// Feature slides for each page (up to 10)
for (let i = 0; i < Math.min(pages.length, 10); i++) {
  const p = pages[i];
  slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
  slide.addText(p.name, { x: 0.5, y: 1, w: 9, h: 0.6, fontSize: 28, color: '1E3A5F', bold: true });

  const imgPath = p.file ? getImagePath(p.file) : null;
  if (imgPath) {
    slide.addImage({ path: imgPath, x: 0.5, y: 1.7, w: 9, h: 3.3 });
  } else {
    slide.addText('该页面功能说明', { x: 0.5, y: 1.7, w: 9, h: 3, fontSize: 18 });
  }
}

// Summary
slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
slide.addText('总结', { x: 0.5, y: 1, w: 9, h: 0.6, fontSize: 28, color: '1E3A5F', bold: true });
slide.addText(
  `${config.site.name}\n共包含 ${pages.length} 个页面\n访问地址：${config.site.url}`,
  { x: 0.5, y: 1.8, w: 9, h: 2, fontSize: 22, align: 'center' }
);

const outputPath = path.join(OUTPUT_DIR, config.output.pptName);
pptx.writeFile({ fileName: outputPath })
  .then(() => console.log(`PPT生成成功: ${outputPath}`))
  .catch(err => console.error('PPT生成失败:', err));
