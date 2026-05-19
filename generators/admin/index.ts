import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Load or discover config
const configPath = process.argv[2] || './config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const OUTPUT_DIR = path.resolve(config.output?.screenshotDir || './screenshots');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let screenshotCounter = 0;

async function screenshot(page: any, name: string, waitMs = 2000) {
  screenshotCounter++;
  const fileName = `${String(screenshotCounter).padStart(3, '0')}_${name}.png`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  await page.waitForTimeout(waitMs);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  [OK] Screenshot: ${fileName}`);
  return fileName;
}

async function verifyBreadcrumb(page: any) {
  return page.evaluate(() => {
    for (const sel of ['.breadcrumb', '.nav-breadcrumb', '[class*="breadcrumb"]', '.el-breadcrumb', '.page-header']) {
      const el = document.querySelector(sel);
      if (el) return el.textContent?.trim() || '';
    }
    const header = document.querySelector('h1, .page-title, .content-title');
    return header?.textContent?.trim() || document.title;
  });
}

async function discoverMenus(page: any): Promise<Array<{ name: string; className: string }>> {
  console.log('  🔍 自动探测菜单结构...');

  const discovered = await page.evaluate(() => {
    const modules: Array<{ name: string; className: string }> = [];
    const seen = new Set<string>();

    // Strategy 1: Look for main-menu-item pattern
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const className = (el as any).className || '';
      if (typeof className === 'string' && className.includes('main-menu-item')) {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 20 && !seen.has(text)) {
          seen.add(text);
          const match = className.match(/menu_[a-zA-Z0-9_]+/);
          modules.push({ name: text, className: match ? match[0] : '' });
        }
      }
    }

    // Strategy 2: Look for common menu patterns
    if (modules.length === 0) {
      const patterns = ['.el-menu-item', '.ant-menu-item', '.sidebar .menu-item', 'aside li > a', 'nav li'];
      for (const pattern of patterns) {
        const items = document.querySelectorAll(pattern);
        for (const el of items) {
          const text = el.textContent?.trim();
          if (text && text.length > 0 && text.length < 20 && !seen.has(text)) {
            seen.add(text);
            modules.push({ name: text, className: '' });
          }
        }
      }
    }

    return modules;
  });

  console.log(`  ✅ 发现 ${discovered.length} 个主菜单`);
  for (const m of discovered) {
    console.log(`     📁 ${m.name} ${m.className ? `(class: ${m.className})` : ''}`);
  }

  return discovered;
}

async function getSubMenus(page: any): Promise<string[]> {
  const subMenus = await page.evaluate(() => {
    const items: string[] = [];
    const seen = new Set<string>();
    const all = document.querySelectorAll('.menu-item:not(.main-menu-item), .menu-chider-item, .el-menu-item:not(.main-menu-item), .ant-menu-item:not(.ant-menu-submenu)') as any;
    for (const el of all) {
      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 30) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (rect.width > 0 && rect.height > 0 && style.display !== 'none') {
          if (!seen.has(text)) {
            seen.add(text);
            items.push(text);
          }
        }
      }
    }
    return items;
  });

  // Filter out merged text
  return subMenus.filter((text: string) => {
    for (const other of subMenus) {
      if (other !== text && text.includes(other) && text.length > other.length + 2) {
        return false;
      }
    }
    return true;
  });
}

async function main() {
  console.log('============================================');
  console.log('  AI网站后台使用手册生成器');
  console.log(`  目标: ${config.site?.name || '未命名'}`);
  console.log(`  URL: ${config.site?.url}`);
  console.log('============================================\n');

  // Clean old screenshots
  const oldFiles = fs.readdirSync(OUTPUT_DIR).filter((f: string) => f.endsWith('.png'));
  for (const f of oldFiles) fs.unlinkSync(path.join(OUTPUT_DIR, f));
  console.log(`[1/4] 清理旧截图: ${oldFiles.length} 张已删除`);

  const browser = await chromium.launch({
    headless: config.options?.headless ?? true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: config.options?.viewport || { width: 1920, height: 1080 } });
  const page = await context.newPage();

  try {
    // Login
    console.log('\n[2/4] 开始登录...');
    const loginUrl = `${config.site.url}${config.site.loginPath || '/login'}`;
    await page.goto(loginUrl, { waitUntil: 'networkidle' });
    await screenshot(page, '01_login_page', 3000);

    const usernameSel = config.selectors?.usernameInput || 'input[type="text"]';
    const passwordSel = config.selectors?.passwordInput || 'input[type="password"]';
    const loginBtnSel = config.selectors?.loginButton || 'button[type="submit"]';

    await page.fill(usernameSel, config.credentials.username);
    await page.fill(passwordSel, config.credentials.password);
    await screenshot(page, '02_login_filled', 1000);

    await page.click(loginBtnSel);
    await page.waitForTimeout(config.options?.waitAfterLogin || 5000);
    await screenshot(page, '03_select_org', 3000);

    // Enter admin panel
    const orgSel = config.selectors?.orgSelector || '.shop-item.admin-item';
    await page.evaluate((sel: string) => {
      const el = document.querySelector(sel);
      if (el) (el as HTMLElement).click();
    }, orgSel);
    await page.waitForTimeout(config.options?.waitAfterOrgSelect || 8000);
    await screenshot(page, '04_dashboard', 4000);
    console.log('  登录成功！');

    // Discover or use configured modules
    const modules = config.modules?.length > 0
      ? config.modules
      : await discoverMenus(page);

    // Save discovered modules back to config
    if (!config.modules || config.modules.length === 0) {
      config.modules = modules;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log('\n  💾 已自动探测并保存菜单结构到 config.json');
    }

    // Screenshot each module
    console.log('\n[3/4] 开始截图各模块...');
    const results: any[] = [];

    for (const mod of modules) {
      console.log(`\n  === ${mod.name} ===`);
      const safeName = mod.name.replace(/[^\w一-龥]/g, '_');

      // Click main menu
      let clicked = false;
      if (mod.className) {
        const menuEl = await page.$(`.main-menu-item.${mod.className}`);
        if (menuEl && await menuEl.isVisible().catch(() => false)) {
          await menuEl.click();
          clicked = true;
        }
      }
      if (!clicked) {
        // Fallback: click by text
        await page.evaluate((text: string) => {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            if (el.textContent?.trim() === text && el.children.length <= 2) {
              (el as HTMLElement).click();
              return;
            }
          }
        }, mod.name);
      }

      await page.waitForTimeout(config.options?.waitAfterClick || 3000);
      const breadcrumb = await verifyBreadcrumb(page);
      console.log(`  面包屑: "${breadcrumb}"`);

      const mainFile = await screenshot(page, `${safeName}_main`, 2000);
      results.push({ module: mod.name, submenu: '(main)', file: mainFile, breadcrumb, ok: true });

      // Get and click submenus
      const subMenus = await getSubMenus(page);
      console.log(`  子菜单: ${subMenus.join(', ') || '无'}`);

      for (const subText of subMenus) {
        try {
          // Click submenu
          const subEls = await page.$$('.menu-item:not(.main-menu-item), .menu-chider-item');
          let subClicked = false;
          for (const subEl of subEls) {
            const text = await subEl.textContent();
            if (text?.trim() === subText && await subEl.isVisible().catch(() => false)) {
              await subEl.click();
              subClicked = true;
              break;
            }
          }
          if (!subClicked) {
            await page.evaluate((t: string) => {
              const all = document.querySelectorAll('.menu-item:not(.main-menu-item), .menu-chider-item');
              for (const el of all) {
                if (el.textContent?.trim() === t) { (el as HTMLElement).click(); return; }
              }
            }, subText);
          }

          await page.waitForTimeout(config.options?.waitAfterClick || 3000);
          const subBreadcrumb = await verifyBreadcrumb(page);
          const subSafe = subText.replace(/[^\w一-龥]/g, '_');
          const subOk = subBreadcrumb.includes(subText) || subBreadcrumb.includes(mod.name);
          console.log(`    [${subText}] OK=${subOk}`);

          const subFile = await screenshot(page, `${safeName}_${subSafe}`, 2500);
          results.push({ module: mod.name, submenu: subText, file: subFile, breadcrumb: subBreadcrumb, ok: subOk });
        } catch (e: any) {
          console.log(`    [ERROR] ${subText}: ${e.message}`);
        }
      }
    }

    const okCount = results.filter((r: any) => r.ok).length;
    console.log('\n============================================');
    console.log(`  截图完成！总计: ${results.length}, 成功: ${okCount}`);
    console.log(`  截图目录: ${OUTPUT_DIR}`);
    console.log('============================================');

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await browser.close();
  }

  console.log('\n[4/4] 下一步：运行文档生成');
  console.log('  node generate-doc.cjs  # 生成Word手册');
  console.log('  node generate-ppt.cjs  # 生成PPT');
}

main();
