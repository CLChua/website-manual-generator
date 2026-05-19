import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const configPath = process.argv[2] || './config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const OUTPUT_DIR = path.resolve(config.output?.screenshotDir || './screenshots');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let screenshotCounter = 0;

// Scroll page to bottom progressively (trigger lazy loading), then back to top
async function fullScroll(page: any, steps = 5, delay = 800) {
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const stepSize = Math.max(viewportHeight, Math.ceil(totalHeight / steps));

  for (let y = 0; y <= totalHeight; y += stepSize) {
    await page.evaluate((pos: number) => window.scrollTo(0, pos), y);
    await page.waitForTimeout(delay);
  }
  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

// Try to dismiss guide/intro overlays before screenshot
async function dismissOverlay(page: any): Promise<boolean> {
  let totalDismissed = 0;
  const closeTexts = [
    '稍后再看', '跳过', '跳过引导', '关闭', '我知道了', '知道了',
    'Skip', 'Close', 'Got it', 'Dismiss', 'Later',
    '×', '✕', '✖', '关闭引导', '不再显示',
  ];

  // Phase 1: 点击关闭按钮 (最自然的方式，避免触发额外动画)
  let clickedAny = false;
  for (const text of closeTexts) {
    try {
      const clicked = await page.evaluate((t: string) => {
        const allEls = document.querySelectorAll('button, a, span, div, [role="button"]');
        for (const el of allEls) {
          const elText = el.textContent?.trim() || '';
          if (elText === t) {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            if (rect.width > 0 && rect.height > 0 &&
                style.display !== 'none' && style.visibility !== 'hidden' &&
                style.opacity !== '0') {
              (el as HTMLElement).click();
              return true;
            }
          }
        }
        return false;
      }, text);

      if (clicked) {
        clickedAny = true;
        totalDismissed++;
        console.log(`    💡 已点击关闭按钮: "${text}"`);
        await page.waitForTimeout(2000);
        break; // 只点击一次就够，避免触发多个引导状态
      }
    } catch (e) { /* ignore */ }
  }

  if (!clickedAny) {
    // 兜底：只有在没找到任何关闭按钮时，才用 CSS hide 含有"引导/遮罩"明确特征的元素
    const hidden = await page.evaluate(() => {
      let count = 0;
      document.querySelectorAll<HTMLElement>('*').forEach(el => {
        const skipTags = ['HEADER', 'NAV', 'MAIN', 'SECTION', 'FOOTER', 'ARTICLE', 'ASIDE', 'BODY', 'HTML'];
        if (skipTags.includes(el.tagName)) return;
        if (el.querySelector('img') && el.children.length > 3) return;

        const style = window.getComputedStyle(el);
        const z = parseInt(style.zIndex);
        const isFixed = style.position === 'fixed' || style.position === 'absolute';
        if (!isFixed || isNaN(z) || z < 1000) return;

        const className = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
        if (className.includes('nav') || className.includes('header') ||
            className.includes('top-bar') || className.includes('menu')) return;

        // 只 hide 明确的引导/遮罩元素（要有 class 关键字匹配）
        const hasOverlayClass =
          className.includes('mask') || className.includes('overlay') ||
          className.includes('guide') || className.includes('tour') ||
          className.includes('intro') || className.includes('driver') ||
          className.includes('shepherd') || className.includes('introjs');

        if (hasOverlayClass && el.style.display !== 'none') {
          el.style.setProperty('display', 'none', 'important');
          count++;
        }
      });
      return count;
    });

    if (hidden > 0) {
      console.log(`    💡 兜底隐藏 ${hidden} 个明确的引导/遮罩元素`);
      totalDismissed += hidden;
    }
  }

  return totalDismissed > 0;
}

async function screenshot(page: any, name: string, waitMs = 2000): Promise<string | null> {
  screenshotCounter++;
  const fileName = `${String(screenshotCounter).padStart(3, '0')}_${name}.png`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  await page.waitForTimeout(waitMs);

  // 1. Dismiss any guide/overlay first
  await dismissOverlay(page);
  await page.waitForTimeout(500);

  // 2. Trigger lazy loading by scrolling, then back to top
  if (config.options?.scrollBeforeScreenshot !== false) {
    await fullScroll(page, config.options?.scrollSteps || 5, config.options?.scrollDelay || 800);
  }

  // 3. Dismiss any new overlay that may have appeared after scrolling
  await dismissOverlay(page);

  // 4. Force scroll back to top
  await page.evaluate(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });

  // 5. 等待页面动画/渲染稳定
  await page.waitForTimeout(5000);

  // 6. Full-page (long) screenshot
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  [OK] Screenshot: ${fileName}`);
  return fileName;
}

function normalizeUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return '';
  }
}

function getPageNameFromUrl(url: string, baseUrl: string, fallbackTitle?: string): string {
  try {
    const u = new URL(url);
    let pathname = u.pathname.replace(/^\//, '').replace(/\/$/, '');
    if (!pathname || pathname === 'index' || pathname === 'index.html') return '首页';
    // Use last segment, decode if needed
    const segments = pathname.split('/').filter(Boolean);
    const last = decodeURIComponent(segments[segments.length - 1]);
    return last.replace(/[-_]/g, ' ') || fallbackTitle || '未命名页面';
  } catch {
    return fallbackTitle || '未命名页面';
  }
}

function isExcluded(url: string, excludePatterns: string[]): boolean {
  const lower = url.toLowerCase();
  for (const pattern of excludePatterns) {
    if (lower.includes(pattern.toLowerCase())) return true;
  }
  return false;
}

// Extract links from navigation area only
async function extractNavLinks(page: any, navSelectors: string[], baseUrl: string): Promise<Array<{ url: string; text: string }>> {
  const links = await page.evaluate((selectors: string[]) => {
    const results: Array<{ url: string; text: string }> = [];
    const seen = new Set<string>();

    // Try each selector in order, stop at the first one that returns results
    let matched: NodeListOf<Element> | null = null;
    let matchedSelector = '';
    for (const sel of selectors) {
      try {
        const items = document.querySelectorAll(sel);
        if (items.length > 0) {
          matched = items;
          matchedSelector = sel;
          break;
        }
      } catch (e) { /* invalid selector, skip */ }
    }

    // Fallback to common patterns if nothing matched
    if (!matched) {
      for (const sel of ['nav a', 'header a']) {
        const items = document.querySelectorAll(sel);
        if (items.length > 0) {
          matched = items;
          matchedSelector = sel;
          break;
        }
      }
    }

    if (matched) {
      for (const a of matched) {
        const href = (a as HTMLAnchorElement).getAttribute('href');
        const text = a.textContent?.trim() || '';
        if (!href || href.startsWith('javascript:') || href.startsWith('#')) continue;
        if (href.startsWith('mailto:') || href.startsWith('tel:')) continue;

        const key = `${href}::${text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ url: href, text });
      }
    }

    return { matchedSelector, links: results };
  }, navSelectors);

  console.log(`  使用导航选择器: "${links.matchedSelector || '未找到匹配'}"`);

  // Normalize URLs
  const normalized: Array<{ url: string; text: string }> = [];
  const seenUrls = new Set<string>();
  for (const link of links.links) {
    const full = normalizeUrl(link.url, baseUrl);
    if (full && !seenUrls.has(full)) {
      seenUrls.add(full);
      normalized.push({ url: full, text: link.text });
    }
  }
  return normalized;
}

async function performLogin(page: any): Promise<boolean> {
  if (!config.login?.enabled) return false;

  console.log('\n  🔐 执行登录流程...');
  const loginUrl = normalizeUrl(config.login.loginPath || '/login', config.site.url);
  await page.goto(loginUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await screenshot(page, 'login_page', 1500);

  try {
    const userSel = config.login.selectors?.usernameInput;
    const passSel = config.login.selectors?.passwordInput;
    const btnSel = config.login.selectors?.loginButton;

    if (userSel) await page.fill(userSel, config.login.username);
    if (passSel) await page.fill(passSel, config.login.password);
    if (btnSel) await page.click(btnSel);

    await page.waitForTimeout(config.options?.waitAfterLoad || 4000);
    console.log(`  ✅ 登录后 URL: ${page.url()}`);
    return true;
  } catch (e: any) {
    console.log(`  ❌ 登录失败: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('============================================');
  console.log('  AI网站前台使用手册生成器');
  console.log(`  目标: ${config.site?.name || '未命名'}`);
  console.log(`  URL: ${config.site?.url}`);
  console.log(`  类型: ${config.site?.type === 'industry' ? '行业网站(含会员中心)' : '企业官网'}`);
  console.log(`  登录: ${config.login?.enabled ? '需要' : '不需要'}`);
  console.log('============================================\n');

  // Clean old screenshots
  const oldFiles = fs.readdirSync(OUTPUT_DIR).filter((f: string) => f.endsWith('.png'));
  for (const f of oldFiles) fs.unlinkSync(path.join(OUTPUT_DIR, f));
  console.log(`[1/4] 清理旧截图: ${oldFiles.length} 张已删除`);

  const browser = await chromium.launch({
    headless: config.options?.headless ?? true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({
    viewport: config.options?.viewport || { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  // Forward browser console to terminal for debugging
  page.on('console', (msg: any) => {
    const text = msg.text();
    if (text.startsWith('[HIDE]')) console.log('    🔎', text);
  });

  const pageInfos: Array<{ name: string; url: string; title: string; file: string | null; category: string }> = [];

  try {
    // Step 1: Visit homepage
    console.log('\n[2/4] 访问首页并截图...');
    const homeUrl = normalizeUrl(config.site.homePath || '/', config.site.url);
    await page.goto(homeUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(config.options?.waitAfterLoad || 4000);
    const homeTitle = await page.title();
    const homeFile = await screenshot(page, '首页', 2000);
    pageInfos.push({ name: '首页', url: homeUrl, title: homeTitle, file: homeFile, category: '公共页面' });

    // Step 2: Extract navigation links
    console.log('\n[3/4] 从首页导航栏提取链接...');
    const navSelectors = config.options?.navSelectors || ['header nav a', '.navbar a'];
    const navLinks = await extractNavLinks(page, navSelectors, config.site.url);
    console.log(`  发现 ${navLinks.length} 个导航链接:`);
    for (const link of navLinks) {
      console.log(`    - [${link.text}] ${link.url}`);
    }

    // Filter and deduplicate
    const baseDomain = new URL(config.site.url).hostname;
    const excludePatterns = config.options?.excludePatterns || [];
    const visitedUrls = new Set<string>([homeUrl]);

    const linksToVisit = navLinks.filter(link => {
      if (visitedUrls.has(link.url)) return false;
      if (isExcluded(link.url, excludePatterns)) return false;
      if (config.options?.sameDomainOnly !== false) {
        try {
          if (new URL(link.url).hostname !== baseDomain) return false;
        } catch { return false; }
      }
      return true;
    });

    // Step 3: Visit each nav page
    console.log(`\n  开始访问 ${linksToVisit.length} 个导航页面...`);
    const maxPages = config.options?.maxPages || 30;
    let count = 1;
    for (const link of linksToVisit) {
      if (visitedUrls.size >= maxPages) break;
      if (visitedUrls.has(link.url)) continue;
      visitedUrls.add(link.url);

      try {
        console.log(`\n  [${count}/${linksToVisit.length}] ${link.text || '未命名'} -> ${link.url}`);
        await page.goto(link.url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(config.options?.waitAfterLoad || 4000);

        const title = await page.title();
        const pageName = link.text || getPageNameFromUrl(link.url, config.site.url, title);
        const safeName = pageName.replace(/[^\w一-龥\s]/g, '_').trim();
        const file = await screenshot(page, safeName, 2000);

        pageInfos.push({ name: pageName, url: link.url, title, file, category: '公共页面' });
      } catch (e: any) {
        console.log(`    [ERROR] 访问失败: ${e.message}`);
      }
      count++;
    }

    // Step 4: Login and visit member pages (if industry site)
    if (config.login?.enabled && config.login.username && config.login.password) {
      console.log('\n[4/4] 访问会员中心页面...');
      const loggedIn = await performLogin(page);

      if (loggedIn && config.site.type === 'industry' && config.login.memberPages) {
        for (const memberPage of config.login.memberPages) {
          try {
            const memberUrl = normalizeUrl(memberPage.path, config.site.url);
            console.log(`\n  访问会员页面: ${memberPage.name} -> ${memberUrl}`);
            await page.goto(memberUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(config.options?.waitAfterLoad || 4000);

            const title = await page.title();
            const safeName = memberPage.name.replace(/[^\w一-龥]/g, '_');
            const file = await screenshot(page, `会员_${safeName}`, 2000);

            pageInfos.push({ name: memberPage.name, url: memberUrl, title, file, category: '会员中心' });
          } catch (e: any) {
            console.log(`    [ERROR] ${e.message}`);
          }
        }
      } else if (config.site.type === 'corporate') {
        console.log('  企业官网类型，跳过会员中心页面。');
      }
    } else {
      console.log('\n[4/4] 未启用登录或类型为企业官网，跳过会员中心。');
    }

    console.log('\n============================================');
    console.log(`  截图完成！共访问 ${pageInfos.length} 个页面`);
    console.log(`  截图目录: ${OUTPUT_DIR}`);
    console.log('============================================');

    // Save page info
    const pageInfoPath = path.join(path.dirname(configPath), 'page-info.json');
    fs.writeFileSync(pageInfoPath, JSON.stringify({
      discoveredAt: new Date().toISOString(),
      siteName: config.site.name,
      baseUrl: config.site.url,
      siteType: config.site.type,
      pages: pageInfos,
    }, null, 2));
    console.log(`\n💾 页面信息已保存到 page-info.json`);

    console.log('\n📝 下一步：编写真实功能描述（descriptions.json）');
    console.log('  说明：本生成器面向甲方客户。文档应突出网站价值、视觉设计、用户体验。');

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await browser.close();
  }
}

main();
