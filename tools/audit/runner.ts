import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { assembleResult, collectAccessibilityTree, collectElements, runAxe, testKeyboard } from './collect';
import { sanitizeUrl } from './privacy';
import type { AuditResult, BehaviorResult, ElementRecord } from './types';

const newBehavior = (mode: string, allowed: boolean): BehaviorResult =>
  ({ mode, interactionsAllowed: allowed, states: [], interactions: [], network: [], errors: [] });

function watchNetwork(page: Page, result: BehaviorResult): void {
  page.on('request', (request) => {
    try {
      const item = { method: request.method(), resourceType: request.resourceType(), origin: new URL(request.url()).origin };
      if (!result.network.some((entry) => JSON.stringify(entry) === JSON.stringify(item))) result.network.push(item);
    } catch { /* non-URL request */ }
  });
}

async function auditState(page: Page, context: BrowserContext, name: string) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const elements = await collectElements(page, cdp, name);
  const tree = await collectAccessibilityTree(page, cdp);
  await cdp.detach();
  return { elements, tree: tree.text, axCount: tree.count };
}

export async function runFixture(compare = false): Promise<AuditResult> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ru-RU' });
  const page = await context.newPage();
  const activity = newBehavior(compare ? 'compare' : 'fixture', false);
  watchNetwork(page, activity);
  await page.route(/^https?:/, (route) => route.abort('blockedbyclient'));
  const source = (await readFile(resolve('ozon-dom.html'), 'utf8'))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<!-- script removed by offline audit -->');
  await page.setContent(source, { waitUntil: 'domcontentloaded' });

  const before = await auditState(page, context, 'before');
  activity.states.push({ name: 'Сохранённый DOM до исправлений', url: 'offline:ozon-dom.html', elementCount: before.elements.length, axNodeCount: before.axCount, notes: ['Скрипты fixture не выполнялись; внешняя сеть заблокирована.'] });
  let elements: ElementRecord[] = before.elements;
  let tree = before.tree;
  let axe: Record<string, unknown> = await runAxe(page);

  if (compare) {
    const beforeAxe = axe;
    await page.addScriptTag({ path: resolve('dist/content.js') });
    await page.waitForTimeout(100);
    const after = await auditState(page, context, 'after');
    const afterAxe = await runAxe(page);
    elements = [...before.elements, ...after.elements];
    tree = `${before.tree}\n\n${after.tree}`;
    axe = { before: beforeAxe, after: afterAxe, violations: (afterAxe.violations as unknown[]) ?? [] };
    activity.states.push({ name: 'После OzonAccess', url: 'offline:ozon-dom.html', elementCount: after.elements.length, axNodeCount: after.axCount, notes: ['Подключён production-бандл dist/content.js.'] });
  }

  const finalState = compare ? 'after' : 'before';
  const keyboard = await testKeyboard(page, elements.filter((item) => item.state === finalState));
  await browser.close();
  return assembleResult(compare ? 'compare' : 'fixture', 'ozon-dom.html', elements, tree, axe, keyboard, activity,
    ['Fixture не содержит работающего приложения и реальных обработчиков Ozon.', 'Chromium не воспроизводит серверное состояние и NVDA.', 'Неизвестные элементы не нажимались.']);
}

export async function runLive(allowSafeInteractions: boolean): Promise<AuditResult> {
  const profile = await mkdtemp(resolve(tmpdir(), 'ozon-access-audit-'));
  const activity = newBehavior('live', allowSafeInteractions);
  let context: BrowserContext | undefined;
  const elements: ElementRecord[] = [];
  let tree = '';
  try {
    context = await chromium.launchPersistentContext(profile, { headless: true, locale: 'ru-RU', viewport: { width: 1440, height: 1000 } });
    const page = context.pages()[0] ?? await context.newPage();
    watchNetwork(page, activity);
    try { await page.goto('https://www.ozon.ru/', { waitUntil: 'domcontentloaded', timeout: 45_000 }); }
    catch (error) { activity.errors.push(`Навигация: ${String(error)}`); }
    const initialText = await page.locator('body').innerText().catch(() => '');
    if (/Похоже, нет соединения|Access denied|captcha|провер(ка|яем).*(браузер|соединени)/i.test(initialText)) {
      activity.errors.push('Ozon показал служебную страницу ошибки или защиты; содержимое главной страницы не получено.');
    }
    const pageText = await page.locator('body').innerText().catch(() => '');
    if (/Похоже, нет соединения|access denied|captcha|провер(ка|яем).*браузер/i.test(pageText)) {
      activity.errors.push('Ozon показал страницу ошибки или ограничения доступа; содержимое главной страницы не получено.');
    }

    const capture = async (name: string, note: string[] = []) => {
      const state = await auditState(page, context!, name);
      elements.push(...state.elements);
      tree += `${tree ? '\n\n' : ''}${state.tree}`;
      activity.states.push({ name, url: sanitizeUrl(page.url()), elementCount: state.elements.length, axNodeCount: state.axCount, notes: note });
    };
    await capture('live-loaded');
    if (elements.some((item) => item.state === 'live-loaded' && /Похоже, нет соединения|Access denied|captcha/i.test(item.text))) {
      activity.errors.push('Ozon показал служебную страницу ошибки или защиты; содержимое главной страницы не получено.');
    }
    await page.waitForTimeout(5_000);
    await capture('live-complete');
    await page.evaluate(() => scrollTo({ top: Math.min(document.body.scrollHeight, 3000), behavior: 'instant' }));
    await page.waitForTimeout(2_000);
    await capture('live-scrolled', ['Выполнена только прокрутка; неизвестные элементы не нажимались.']);

    if (allowSafeInteractions) {
      const input = page.locator('input[name="text"][type="text"]').first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill('книга');
        await page.waitForTimeout(1500);
        activity.interactions.push({ action: 'fill-search', value: 'книга', safety: 'confirmed-safe', clicked: false });
        await capture('live-search-suggestions', ['Запрос не отправлялся кнопкой или Enter.']);
        await input.fill('');
      } else activity.errors.push('Поле поиска недоступно; состояние подсказок не получено.');
    }

    const axe = await runAxe(page);
    const keyboard = await testKeyboard(page, elements.filter((item) => item.state === 'live-scrolled'));
    return assembleResult('live', sanitizeUrl(page.url()), elements, tree, axe, keyboard, activity,
      ['Покрыты только состояния неавторизованного временного профиля.', 'Антибот-защита не обходилась.', 'Неизвестные элементы не нажимались.']);
  } catch (error) {
    activity.errors.push(String(error));
    return assembleResult('live', 'https://www.ozon.ru/', elements, tree, { violations: [] },
      { tabStops: [], reverseStops: [], repeatedFocus: [], possibleTrap: false, notes: ['Проверка клавиатуры не выполнена из-за ошибки загрузки.'] }, activity,
      ['Страница Ozon не была полностью доступна автоматизированному браузеру.', 'Неизвестные элементы не нажимались.']);
  } finally {
    await context?.close().catch(() => undefined);
    if (profile.startsWith(resolve(tmpdir(), 'ozon-access-audit-'))) await rm(profile, { recursive: true, force: true });
  }
}
