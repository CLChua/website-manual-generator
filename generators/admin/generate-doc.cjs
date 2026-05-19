const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, PageBreak } = require('docx');
const fs = require('fs');
const path = require('path');

const configPath = process.argv[2] || './config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const SCREENSHOT_DIR = path.resolve(config.output.screenshotDir);
const OUTPUT_DIR = path.resolve('.');

// Load descriptions
let descriptions = null;
const descPath = path.join(path.dirname(configPath), 'descriptions.json');
if (fs.existsSync(descPath)) {
  descriptions = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
  console.log(`[INFO] 已加载真实功能描述: ${descPath}`);
} else {
  console.log(`[WARN] 未找到 descriptions.json，文档将使用通用描述。`);
  console.log(`       建议在截图完成后，基于截图编写 descriptions.json 以获得准确的功能说明。`);
}

// Auto-discover modules from screenshots
function discoverModulesFromScreenshots() {
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png') && f.includes('_main'));
  const modules = [];
  for (const f of files.sort()) {
    const match = f.match(/^\d+_(.+?)_main\.png$/);
    if (match) {
      const safeName = match[1];
      const displayName = safeName.replace(/_/g, '');
      modules.push({ name: displayName });
    }
  }
  return modules;
}

if (!config.modules || config.modules.length === 0) {
  config.modules = discoverModulesFromScreenshots();
  console.log(`[INFO] 从截图自动发现 ${config.modules.length} 个模块`);
}

function getImageBuffer(fileName) {
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
}

function getScreenshotsByPrefix(prefix) {
  return fs.readdirSync(SCREENSHOT_DIR)
    .filter(f => f.includes(prefix) && f.endsWith('.png'))
    .sort();
}

function getSubMenuScreenshots(safeName) {
  return fs.readdirSync(SCREENSHOT_DIR)
    .filter(f => f.includes(`_${safeName}_`) && f.endsWith('.png') && !f.includes('_main'))
    .sort();
}

function extractSubMenuName(fileName, moduleSafeName) {
  const regex = new RegExp(`\\d+_${moduleSafeName}_(.+?)\\.png$`);
  const match = fileName.match(regex);
  return match ? match[1].replace(/_/g, '') : '';
}

function addImage(children, fileName, width = 550, height = 310) {
  const imgBuffer = getImageBuffer(fileName);
  if (imgBuffer) {
    children.push(
      new Paragraph({
        children: [new ImageRun({ data: imgBuffer, transformation: { width, height }, type: 'png' })],
        spacing: { after: 200 },
      }),
    );
  }
}

function addText(children, text, opts = {}) {
  const lines = text.split('\n');
  for (const line of lines) {
    children.push(new Paragraph({
      children: [new TextRun({ text: line, size: opts.size || 22, bold: opts.bold || false })],
      spacing: { after: opts.spacing || 120 },
    }));
  }
}

function addHeading(children, text, level = HeadingLevel.HEADING_1) {
  children.push(new Paragraph({
    text,
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 400 : 300, after: 200 },
  }));
}

// Get module description from descriptions.json or fallback
function getModuleDesc(moduleName) {
  if (descriptions && descriptions.modules && descriptions.modules[moduleName]) {
    return descriptions.modules[moduleName].description;
  }
  return `${moduleName}管理模块。`;
}

function getSubMenuDesc(moduleName, subMenuName) {
  if (descriptions && descriptions.modules && descriptions.modules[moduleName] && descriptions.modules[moduleName].subMenus) {
    return descriptions.modules[moduleName].subMenus[subMenuName] || `${subMenuName}功能。`;
  }
  return `${subMenuName}功能。`;
}

function getSiteIntro() {
  if (descriptions && descriptions.siteIntro) {
    return descriptions.siteIntro;
  }
  return `${config.site.name} 后台管理系统提供全面的网站内容配置和管理功能。`;
}

async function createDocument() {
  const children = [];

  // Cover
  children.push(
    new Paragraph({ text: '', spacing: { after: 2000 } }),
    new Paragraph({ text: config.site.name, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ text: '使用手册', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
    new Paragraph({ text: `文档版本：${config.site.version}`, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ text: `编制日期：${new Date().toISOString().split('T')[0]}`, alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // TOC
  addHeading(children, '目录');
  const chineseNums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
  const sections = [
    '一、系统概述', '二、登录与访问', '三、功能模块概览',
    ...config.modules.map((m, i) => `${chineseNums[i + 3] || `${i + 4}`}、${m.name}`),
    '附录：常见问题',
  ];
  for (const s of sections) addText(children, s, { spacing: 100 });
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // System Overview
  addHeading(children, '一、系统概述');
  addText(children, getSiteIntro());
  const dashboard = getScreenshotsByPrefix('04_dashboard');
  if (dashboard.length) addImage(children, dashboard[0]);
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Login
  addHeading(children, '二、登录与访问');
  addText(children,
    `访问地址：${config.site.url}\n` +
    `管理员账号：${config.credentials.username}\n` +
    `登录密码：${config.credentials.password}\n\n` +
    '操作步骤：\n' +
    '1. 打开浏览器，输入上述访问地址\n' +
    '2. 在登录页面输入管理员账号和密码\n' +
    '3. 点击"登录"按钮\n' +
    '4. 如系统显示组织选择页面，点击"管理后台"进入系统'
  );
  const loginFiles = ['01_login_page', '02_login_filled', '03_select_org'];
  for (const f of loginFiles) {
    const files = getScreenshotsByPrefix(f);
    if (files.length) addImage(children, files[0]);
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Module Overview
  addHeading(children, '三、功能模块概览');
  addText(children, '系统包含以下功能模块：');
  for (const mod of config.modules) {
    const desc = getModuleDesc(mod.name);
    const brief = desc.split('。')[0] + '。';
    addText(children, `• ${mod.name}：${brief}`);
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Each module
  for (let i = 0; i < config.modules.length; i++) {
    const mod = config.modules[i];
    const num = chineseNums[i + 3] || `${i + 4}`;
    const safeName = mod.name.replace(/[^\w一-龥]/g, '_');

    addHeading(children, `${num}、${mod.name}`);

    // Module description
    const moduleDesc = getModuleDesc(mod.name);
    addText(children, moduleDesc);

    // Get submenu screenshots
    const subFiles = getSubMenuScreenshots(safeName);
    const subMenus = subFiles.map(f => extractSubMenuName(f, safeName)).filter(Boolean);

    // List submenus
    if (subMenus.length > 0) {
      addText(children, '\n本模块包含以下功能：');
      for (const subName of subMenus) {
        const subDesc = getSubMenuDesc(mod.name, subName);
        const brief = subDesc.split('。')[0] + '。';
        addText(children, `• ${subName}：${brief}`);
      }
    }

    // Main screenshot
    const mainFiles = getScreenshotsByPrefix(`${safeName}_main`);
    if (mainFiles.length) {
      addText(children, '\n【模块主界面】', { bold: true });
      addImage(children, mainFiles[0]);
    }

    // Submenu screenshots with descriptions
    if (subFiles.length > 0) {
      addText(children, '\n【子功能详解】', { bold: true });

      for (const subFile of subFiles.slice(0, 8)) {
        const subName = extractSubMenuName(subFile, safeName);
        if (subName) {
          const subDesc = getSubMenuDesc(mod.name, subName);
          addText(children, `\n${subName}`, { bold: true, size: 24 });
          addText(children, subDesc);
        }
        addImage(children, subFile, 550, 310);
      }
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // FAQ
  addHeading(children, '附录：常见问题');
  addText(children,
    'Q1：忘记密码怎么办？\nA：请联系系统管理员重置密码。\n\n' +
    'Q2：如何添加新的内容？\nA：进入对应的内容管理模块（如新闻、产品、案例等），点击"新增"按钮，填写信息后保存。\n\n' +
    'Q3：如何修改系统配置？\nA：进入"设置"模块，选择需要修改的配置项，修改后点击"提交"保存。\n\n' +
    'Q4：如何查看操作记录？\nA：进入"权限"模块的"操作日志"页面，可以查看所有管理员的操作记录。\n\n' +
    'Q5：系统支持哪些浏览器？\nA：建议使用 Chrome、Firefox、Edge 等主流浏览器的最新版本。'
  );
  addText(children,
    `\n系统信息\n系统名称：${config.site.name}\n系统版本：${config.site.version}\n访问地址：${config.site.url}\n技术支持：请联系系统管理员`
  );

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } } },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(OUTPUT_DIR, config.output.docName), buffer);
  console.log(`Word文档生成成功: ${path.join(OUTPUT_DIR, config.output.docName)}`);
}

createDocument().catch(console.error);
