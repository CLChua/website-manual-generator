const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, PageBreak } = require('docx');
const fs = require('fs');
const path = require('path');

const configPath = process.argv[2] || './config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const SCREENSHOT_DIR = path.resolve(config.output?.screenshotDir || './screenshots');
const OUTPUT_DIR = path.resolve('.');

// Load descriptions (必须存在，否则用通用描述)
let descriptions = null;
const descPath = path.join(path.dirname(configPath), 'descriptions.json');
if (fs.existsSync(descPath)) {
  descriptions = JSON.parse(fs.readFileSync(descPath, 'utf-8'));
  console.log(`[INFO] 已加载功能描述: ${descPath}`);
} else {
  console.log(`[WARN] 未找到 descriptions.json！`);
  console.log(`       请基于截图编写 descriptions.json 后再生成文档，以确保描述准确。`);
}

// Load page info
let pageInfo = null;
const infoPath = path.join(path.dirname(configPath), 'page-info.json');
if (fs.existsSync(infoPath)) {
  pageInfo = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
} else {
  console.log(`[ERROR] 未找到 page-info.json，请先运行 npx tsx index.ts`);
  process.exit(1);
}

function getImageBuffer(fileName) {
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
}

function addImage(children, fileName, width = 550, height = 380) {
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

function getPageDesc(pageName) {
  if (descriptions && descriptions.pages && descriptions.pages[pageName]) {
    return descriptions.pages[pageName];
  }
  return null;
}

function getSiteIntro() {
  if (descriptions && descriptions.siteIntro) {
    return descriptions.siteIntro;
  }
  return `${config.site.name} 是一个专为${config.audience || '客户'}打造的网站平台，致力于提供优质的访问体验和服务。`;
}

function getDesignHighlights() {
  if (descriptions && descriptions.designHighlights) {
    return descriptions.designHighlights;
  }
  return '本网站采用现代化设计风格，注重用户体验和视觉效果。';
}

async function createDocument() {
  const children = [];
  const pages = pageInfo.pages;

  // Group pages by category
  const publicPages = pages.filter(p => p.category === '公共页面');
  const memberPages = pages.filter(p => p.category === '会员中心');

  // ====== Cover ======
  children.push(
    new Paragraph({ text: '', spacing: { after: 2400 } }),
    new Paragraph({
      children: [new TextRun({ text: config.site.name, size: 56, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '网站使用手册', size: 40 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({ text: '', spacing: { after: 1200 } }),
    new Paragraph({ text: `网站地址：${config.site.url}`, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ text: `文档版本：${config.site.version || 'V1.0'}`, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ text: `编制日期：${new Date().toISOString().split('T')[0]}`, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
    new Paragraph({ text: `读者对象：${config.audience || '客户'}`, alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
  );
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ====== TOC ======
  addHeading(children, '目录');
  const tocItems = ['一、网站简介', '二、设计亮点', '三、页面导览'];
  publicPages.forEach((p, i) => {
    tocItems.push(`  ${i + 1}. ${p.name}`);
  });
  if (memberPages.length > 0) {
    tocItems.push('四、会员中心');
    memberPages.forEach((p, i) => {
      tocItems.push(`  ${i + 1}. ${p.name}`);
    });
  }
  tocItems.push('附录：访问指南');
  for (const t of tocItems) addText(children, t, { spacing: 100 });
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ====== Section 1: Site Introduction ======
  addHeading(children, '一、网站简介');
  addText(children, getSiteIntro());

  // Site homepage screenshot
  const homePage = publicPages.find(p => p.name === '首页');
  if (homePage && homePage.file) {
    addText(children, '\n网站首页预览：', { bold: true });
    addImage(children, homePage.file);
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ====== Section 2: Design Highlights ======
  addHeading(children, '二、设计亮点');
  addText(children, getDesignHighlights());
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // ====== Section 3: Public Pages ======
  addHeading(children, '三、页面导览');
  addText(children, `本网站包含 ${publicPages.length} 个主要页面，依次介绍如下：`);

  for (let i = 0; i < publicPages.length; i++) {
    const p = publicPages[i];
    const desc = getPageDesc(p.name);

    addHeading(children, `3.${i + 1} ${p.name}`, HeadingLevel.HEADING_2);

    if (p.url) {
      addText(children, `访问地址：${p.url}`, { size: 20 });
    }

    if (desc && desc.description) {
      addText(children, desc.description);
    } else {
      addText(children, `${p.name}页面，提供相关内容展示与交互。`);
    }

    if (desc && desc.sections) {
      addText(children, '\n主要内容板块：', { bold: true });
      for (const [sectionName, sectionDesc] of Object.entries(desc.sections)) {
        addText(children, `• ${sectionName}：${sectionDesc}`);
      }
    }

    if (desc && desc.highlights) {
      addText(children, '\n亮点：', { bold: true });
      for (const h of desc.highlights) {
        addText(children, `★ ${h}`);
      }
    }

    if (p.file) {
      addText(children, '\n页面预览：', { bold: true });
      addImage(children, p.file);
    }

    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ====== Section 4: Member Pages (if any) ======
  if (memberPages.length > 0) {
    addHeading(children, '四、会员中心');
    addText(children, '注册并登录后，您可访问以下会员专属页面：');

    for (let i = 0; i < memberPages.length; i++) {
      const p = memberPages[i];
      const desc = getPageDesc(p.name);

      addHeading(children, `4.${i + 1} ${p.name}`, HeadingLevel.HEADING_2);

      if (desc && desc.description) {
        addText(children, desc.description);
      } else {
        addText(children, `${p.name}页面，提供个人相关功能。`);
      }

      if (desc && desc.sections) {
        addText(children, '\n主要功能：', { bold: true });
        for (const [sectionName, sectionDesc] of Object.entries(desc.sections)) {
          addText(children, `• ${sectionName}：${sectionDesc}`);
        }
      }

      if (p.file) {
        addText(children, '\n页面预览：', { bold: true });
        addImage(children, p.file);
      }

      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // ====== Appendix ======
  addHeading(children, '附录：访问指南');
  let appendixText = `网站访问地址：${config.site.url}\n\n` +
    '推荐浏览器：\n' +
    '• Chrome 90+ （强烈推荐）\n' +
    '• Firefox 90+\n' +
    '• Microsoft Edge 90+\n' +
    '• Safari 14+\n\n' +
    '建议使用最新版本浏览器，以获得最佳浏览体验。';

  if (config.login?.enabled && config.login.username) {
    appendixText += `\n\n会员登录信息：\n账号：${config.login.username}\n密码：${config.login.password}\n登录入口：${config.site.url}${config.login.loginPath}`;
  }
  addText(children, appendixText);

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
