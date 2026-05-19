import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

function askWithDefault(question: string, defaultValue: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(`${question} [默认: ${defaultValue}] `, answer => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function suggestType(url: string): 'admin' | 'frontend' {
  // Heuristic: if URL contains 'admin', 'backend', 'manage', it's likely a backend
  const lower = url.toLowerCase();
  if (lower.includes('admin.') || lower.includes('backend.') ||
      lower.includes('manage.') || lower.includes('/admin') ||
      lower.includes('/backend') || lower.includes('/manage')) {
    return 'admin';
  }
  return 'frontend';
}

async function main() {
  console.log(`
${c.cyan}${c.bright}╔══════════════════════════════════════════════╗
║   AI 网站使用手册生成器 - 统一入口            ║
║   后台管理系统 / 网站前台 通用工具            ║
╚══════════════════════════════════════════════╝${c.reset}
`);

  // 1. 询问目标网址
  const url = await ask(`${c.bright}1. 请输入目标网站URL（如 https://admin.example.com）：${c.reset}\n   > `);
  if (!url.startsWith('http')) {
    console.log(`${c.red}❌ URL格式错误，必须以 http:// 或 https:// 开头${c.reset}`);
    rl.close();
    return;
  }

  // 2. 询问网站类型（提供智能建议）
  const suggested = suggestType(url);
  console.log(`\n${c.yellow}💡 根据URL推测，这可能是${suggested === 'admin' ? '后台管理系统' : '前台网站'}。${c.reset}`);

  const typeInput = await ask(`
${c.bright}2. 请选择网站类型：${c.reset}
   [1] 后台管理系统（有菜单、需要登录、数据管理）
   [2] 前台企业官网（公司官网、产品展示，无个人中心）
   [3] 前台行业网站（电商、社区，登录后有个人中心）
   > `);

  let scriptDir: string;
  let configTemplate: any;
  let siteType = '';

  if (typeInput === '1') {
    scriptDir = path.join(__dirname, 'ai-admin-manual-generator');
    siteType = '后台管理系统';
  } else if (typeInput === '2') {
    scriptDir = path.join(__dirname, 'ai-frontend-manual-generator');
    siteType = '企业官网';
  } else if (typeInput === '3') {
    scriptDir = path.join(__dirname, 'ai-frontend-manual-generator');
    siteType = '行业网站';
  } else {
    console.log(`${c.red}❌ 无效选择${c.reset}`);
    rl.close();
    return;
  }

  // 3. 询问登录信息（后台/行业网站需要）
  const needLogin = typeInput === '1' || typeInput === '3';
  let username = '', password = '';
  if (needLogin) {
    username = await ask(`\n${c.bright}3. 登录账号：${c.reset}\n   > `);
    password = await ask(`${c.bright}   登录密码：${c.reset}\n   > `);
  }

  // 4. 询问项目名称（用于创建项目文件夹）
  const siteName = await ask(`\n${c.bright}4. 请输入网站/项目名称（用作文件夹名）：${c.reset}\n   > `);
  if (!siteName) {
    console.log(`${c.red}❌ 项目名称不能为空${c.reset}`);
    rl.close();
    return;
  }

  // 5. 创建项目文件夹
  const projectDir = path.join(__dirname, siteName);
  fs.mkdirSync(projectDir, { recursive: true });

  // 6. 生成 config.json
  const sourceConfig = JSON.parse(fs.readFileSync(path.join(scriptDir, 'config.json'), 'utf-8'));

  if (typeInput === '1') {
    // 后台
    sourceConfig.site.name = siteName;
    sourceConfig.site.url = url;
    sourceConfig.credentials = { username, password };
  } else {
    // 前台
    sourceConfig.site.name = siteName;
    sourceConfig.site.url = url;
    sourceConfig.site.type = typeInput === '3' ? 'industry' : 'corporate';
    sourceConfig.login = sourceConfig.login || {};
    sourceConfig.login.enabled = typeInput === '3';
    if (typeInput === '3') {
      sourceConfig.login.username = username;
      sourceConfig.login.password = password;
    }
  }

  const projectConfigPath = path.join(projectDir, 'config.json');
  fs.writeFileSync(projectConfigPath, JSON.stringify(sourceConfig, null, 2));

  console.log(`\n${c.green}✅ 项目配置已创建: ${projectConfigPath}${c.reset}`);

  // 7. 询问是否立即执行
  const runNow = await ask(`\n${c.bright}5. 是否立即执行截图？(y/n)${c.reset}\n   > `);
  rl.close();

  if (runNow.toLowerCase() !== 'y' && runNow.toLowerCase() !== 'yes') {
    console.log(`
${c.cyan}📋 后续操作步骤：${c.reset}

   1. 进入项目目录：
      cd "${projectDir}"

   2. 运行截图脚本：
      npx tsx "${scriptDir}/index.ts" ./config.json

   3. 查看截图，编写 descriptions.json

   4. 生成文档：
      node "${scriptDir}/generate-doc.cjs" ./config.json
      node "${scriptDir}/generate-ppt.cjs" ./config.json
`);
    return;
  }

  // 8. 立即执行截图（同步等待子进程结束）
  console.log(`\n${c.cyan}🚀 步骤 1/3：开始执行截图...${c.reset}\n`);

  const captureResult = spawnSync('npx', ['tsx', path.join(scriptDir, 'index.ts'), './config.json'], {
    cwd: projectDir,
    stdio: 'inherit',
    shell: true,
  });

  if (captureResult.status !== 0) {
    console.log(`${c.red}❌ 截图过程出错，退出码: ${captureResult.status}${c.reset}`);
    if (captureResult.error) console.log(`${c.red}错误信息: ${captureResult.error.message}${c.reset}`);
    const finalRl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise<void>((resolve) => finalRl.question(`\n${c.yellow}按 Enter 键退出...${c.reset}`, () => { finalRl.close(); resolve(); }));
    return;
  }

  console.log(`\n${c.green}${c.bright}✅ 截图完成！${c.reset}`);

  // 9. 自动生成 descriptions.json 模板（基于已发现的页面/模块）
  const descPath = path.join(projectDir, 'descriptions.json');
  if (!fs.existsSync(descPath)) {
    console.log(`\n${c.cyan}🚀 步骤 2/3：生成 descriptions.json 模板...${c.reset}`);
    let template: any = { siteIntro: `[请基于截图编写 ${siteName} 的简介]` };

    if (typeInput === '1') {
      // 后台：从 config 的 modules 生成
      const updatedConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf-8'));
      template.modules = {};
      for (const mod of updatedConfig.modules || []) {
        template.modules[mod.name] = {
          description: `[请基于截图编写 ${mod.name} 模块的整体功能描述]`,
          subMenus: {},
        };
      }
    } else {
      // 前台：从 page-info.json 生成
      const infoPath = path.join(projectDir, 'page-info.json');
      if (fs.existsSync(infoPath)) {
        const pageInfo = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        template.designHighlights = '[请基于截图描述网站的设计亮点：视觉风格、动效、用户体验等]';
        template.pages = {};
        for (const p of pageInfo.pages || []) {
          template.pages[p.name] = {
            description: `[请基于截图编写 ${p.name} 页面的整体描述]`,
            sections: { '示例区块': '[描述该区块内容]' },
          };
        }
      }
    }

    fs.writeFileSync(descPath, JSON.stringify(template, null, 2));
    console.log(`${c.green}  ✅ 已生成模板: ${descPath}${c.reset}`);
  } else {
    console.log(`\n${c.yellow}ℹ️  已存在 descriptions.json，跳过模板生成${c.reset}`);
  }

  // 10. 打开截图文件夹和 descriptions.json 让用户编辑
  console.log(`\n${c.cyan}📂 正在打开截图文件夹和描述文件...${c.reset}`);
  try {
    // explorer 和 notepad 都是异步打开，spawnSync 不会阻塞
    spawnSync('cmd', ['/c', 'start', '""', 'explorer', path.join(projectDir, 'screenshots')], { shell: false });
    spawnSync('cmd', ['/c', 'start', '""', 'notepad', descPath], { shell: false });
  } catch (e) { /* 即使打开失败也继续 */ }

  // 11. 等待用户编辑完成
  console.log(`
${c.bright}${c.yellow}=========================================================${c.reset}
${c.bright}请按以下步骤操作：${c.reset}

   1. 已自动打开 ${c.cyan}screenshots${c.reset} 文件夹和 ${c.cyan}descriptions.json${c.reset}
   2. 查看每张截图，在 descriptions.json 中填写对应描述
   3. 保存 descriptions.json（Ctrl+S）
   4. 回到本窗口，按 Enter 继续生成 Word 和 PPT

${c.yellow}（如果想跳过描述，直接按 Enter 也行，会用模板占位符生成）${c.reset}
${c.bright}${c.yellow}=========================================================${c.reset}
`);
  const editRl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) => editRl.question('', () => { editRl.close(); resolve(); }));

  // 12. 生成 Word 和 PPT
  console.log(`\n${c.cyan}🚀 步骤 3/3：生成 Word 和 PPT 文档...${c.reset}\n`);

  const docResult = spawnSync('node', [path.join(scriptDir, 'generate-doc.cjs'), './config.json'], {
    cwd: projectDir,
    stdio: 'inherit',
    shell: true,
  });

  const pptResult = spawnSync('node', [path.join(scriptDir, 'generate-ppt.cjs'), './config.json'], {
    cwd: projectDir,
    stdio: 'inherit',
    shell: true,
  });

  if (docResult.status === 0 && pptResult.status === 0) {
    console.log(`
${c.green}${c.bright}🎉 全部完成！${c.reset}

${c.cyan}📋 输出文件：${c.reset}
   ${projectDir}\\${sourceConfig.output.docName}
   ${projectDir}\\${sourceConfig.output.pptName}
`);
    // 打开项目目录
    try {
      spawnSync('explorer', [projectDir], { shell: true });
    } catch (e) { /* ignore */ }
  } else {
    console.log(`${c.red}❌ 文档生成出错${c.reset}`);
    if (docResult.status !== 0) console.log(`${c.red}Word 退出码: ${docResult.status}${c.reset}`);
    if (pptResult.status !== 0) console.log(`${c.red}PPT 退出码: ${pptResult.status}${c.reset}`);
  }

  // 阻塞等待用户按键
  console.log(`\n${c.yellow}按 Enter 键退出...${c.reset}`);
  const finalRl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) => finalRl.question('', () => { finalRl.close(); resolve(); }));
}

main();
