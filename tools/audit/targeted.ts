import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { chromium, type BrowserContext, type CDPSession, type Page } from '@playwright/test';
import { sanitizeHtml, sanitizeUrl, truncate } from './privacy';
import type { TargetedAuditResult, TargetGroupObservation } from './types';

interface TargetDefinition { id: string; purpose: string; svg: string }
type AxValue = { value?: string | number | boolean } | undefined;
type AxNode = { ignored?: boolean; role?: AxValue; name?: AxValue; description?: AxValue; properties?: Array<{ name: string; value?: AxValue }> };

const axValue = (value: AxValue): string | number | boolean => value?.value ?? '';

async function definitions(groupIds: string[]): Promise<TargetDefinition[]> {
  const report = JSON.parse(await readFile(resolve('reports', 'elements.json'), 'utf8')) as { groups?: Array<{ id: string; purpose: string; svg: string }> };
  return groupIds.map((id) => {
    const group = report.groups?.find((item) => item.id === id);
    if (!group?.svg) throw new Error(`Группа ${id} не найдена в reports/elements.json или не имеет SVG-сигнатуры.`);
    return { id, purpose: group.purpose, svg: group.svg };
  });
}

async function listeners(cdp: CDPSession, expression: string): Promise<string[]> {
  try {
    const evaluated = await cdp.send('Runtime.evaluate', { expression, returnByValue: false });
    if (!evaluated.result.objectId) return [];
    const result = await cdp.send('DOMDebugger.getEventListeners', { objectId: evaluated.result.objectId });
    return [...new Set(result.listeners.map((item) => item.type))].sort();
  } catch { return []; }
}

async function ax(cdp: CDPSession, expression: string) {
  try {
    const evaluated = await cdp.send('Runtime.evaluate', { expression, returnByValue: false });
    if (!evaluated.result.objectId) throw new Error('object unavailable');
    const tree = await cdp.send('Accessibility.queryAXTree', { objectId: evaluated.result.objectId });
    const node = tree.nodes[0] as AxNode | undefined;
    const states: Record<string, string | number | boolean> = {};
    for (const property of node?.properties ?? []) states[property.name] = axValue(property.value);
    return { role: String(axValue(node?.role)), name: String(axValue(node?.name)), description: String(axValue(node?.description)), ignored: node?.ignored ?? true, states };
  } catch { return { role: '', name: '', description: '', ignored: true, states: {} as Record<string, string | number | boolean> }; }
}

async function findTargets(page: Page, targets: TargetDefinition[]) {
  await page.evaluate('globalThis.__name = target => target');
  return page.evaluate(async (definitionsToFind) => {
    const digest = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
      .map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 12);
    const path = (element: Element) => {
      const parts: string[] = [];
      let current: Element | null = element;
      while (current && parts.length < 10) {
        let part = current.tagName.toLowerCase();
        const parent: Element | null = current.parentElement;
        if (parent) {
          const siblings = [...parent.children].filter((item) => item.tagName === current!.tagName);
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
        parts.unshift(part); current = parent;
      }
      return parts.join(' > ');
    };
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button:has(svg)')];
    const candidates = await Promise.all(buttons.map(async (button) => {
      const paths = [...button.querySelectorAll('svg path')].map((item) => item.getAttribute('d') ?? '');
      return { button, paths, signature: await digest(paths.join('|')) };
    }));
    return definitionsToFind.map((definition) => {
      const matches = candidates.filter((item) => item.signature === definition.svg);
      const match = matches.find((item) => {
        const rect = item.button.getBoundingClientRect(); const style = getComputedStyle(item.button);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      }) ?? matches[0];
      if (!match) return { groupId: definition.id, matches: 0, found: false };
      const button = match.button;
      const auditId = `target-${definition.id}`;
      button.setAttribute('data-ozon-target-id', auditId);
      let card: Element | null = button;
      let productName = '';
      let productHref = '';
      for (let level = 0; card && level < 8; level += 1, card = card.parentElement) {
        const links = [...card.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]')];
        const named = links.find((link) => (link.innerText ?? '').replace(/\s+/g, ' ').trim().length > 5);
        if (named) { productName = (named.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 300); productHref = named.href; break; }
      }
      const widget = button.closest('[data-widget]');
      const svg = button.querySelector('svg');
      return {
        groupId: definition.id, matches: matches.length, found: true, auditId, domPath: path(button), outerHtml: button.outerHTML,
        svg: { signature: match.signature, viewBox: svg?.getAttribute('viewBox') ?? '', paths: match.paths, title: svg?.querySelector('title')?.textContent ?? '' },
        parentContext: { tag: button.parentElement?.tagName.toLowerCase() ?? '', widget: widget?.getAttribute('data-widget') ?? '', text: (widget?.textContent ?? button.parentElement?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 500), productName, productPath: productHref },
        attributes: { disabled: button.disabled, ariaDisabled: button.getAttribute('aria-disabled'), ariaPressed: button.getAttribute('aria-pressed'), ariaExpanded: button.getAttribute('aria-expanded'), ariaLabel: button.getAttribute('aria-label'), title: button.getAttribute('title'), type: button.getAttribute('type') },
      };
    });
  }, targets);
}

async function imageSnapshot(page: Page, auditId: string): Promise<string[]> {
  return page.locator(`[data-ozon-target-id="${auditId}"]`).evaluate((button) => {
    const scope = button.closest('a[href*="/product/"]') ?? button.parentElement;
    return [...(scope?.querySelectorAll('img') ?? [])].map((image) => [image.getAttribute('src') ?? '', image.getAttribute('srcset') ?? '', image.getAttribute('alt') ?? ''].join('|'));
  });
}

async function arrowInteraction(page: Page, auditId: string): Promise<NonNullable<TargetGroupObservation['interaction']>> {
  const selector = `[data-ozon-target-id="${auditId}"]`;
  const beforeUrl = page.url();
  const before = await imageSnapshot(page, auditId);
  try {
    await page.locator(selector).evaluate((button) => {
      button.closest('a[href]')?.addEventListener('click', (event) => event.preventDefault(), { once: true });
      (button as HTMLButtonElement).click();
    });
    await page.waitForTimeout(700);
    const after = await imageSnapshot(page, auditId);
    return { attempted: true, safeGuard: 'Default navigation of the containing product link was prevented for this click.', urlChanged: page.url() !== beforeUrl, imageChanged: JSON.stringify(before) !== JSON.stringify(after), before: before.map(sanitizeUrl), after: after.map(sanitizeUrl) };
  } catch (error) {
    return { attempted: true, safeGuard: 'Default navigation of the containing product link was prevented for this click.', urlChanged: page.url() !== beforeUrl, imageChanged: false, before: before.map(sanitizeUrl), after: [], error: String(error) };
  }
}

export async function runTargetedLive(groupIds: string[], allowArrowInteractions: boolean, options: { headed?: boolean; browserChannel?: string } = {}): Promise<TargetedAuditResult> {
  const targets = await definitions(groupIds);
  const profile = await mkdtemp(resolve(tmpdir(), 'ozon-access-targeted-'));
  const errors: string[] = [];
  let context: BrowserContext | undefined;
  const observations: TargetGroupObservation[] = [];
  try {
    context = await chromium.launchPersistentContext(profile, { headless: !options.headed, channel: options.browserChannel, locale: 'ru-RU', viewport: { width: 1440, height: 1000 } });
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto('https://www.ozon.ru/', { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch((error) => errors.push(`Навигация: ${String(error)}`));
    await page.waitForTimeout(5_000);
    const pageText = await page.locator('body').innerText().catch(() => '');
    if (/Access denied|captcha|Похоже, нет соединения|провер(ка|яем).*(браузер|соединени)/i.test(pageText)) errors.push('Ozon показал страницу ошибки или защиты.');
    await page.evaluate(() => scrollTo({ top: Math.min(document.body.scrollHeight, 3000), behavior: 'instant' }));
    await page.waitForTimeout(2_000);
    const found = await findTargets(page, targets);
    if (!found.some((item) => item.found)) {
      const diagnostic = await page.evaluate(() => ({
        title: document.title,
        productLinks: document.querySelectorAll('a[href*="/product/"]').length,
        svgButtons: document.querySelectorAll('button:has(svg)').length,
        tileGrids: document.querySelectorAll('[data-widget="tileGridDesktop"]').length,
      }));
      errors.push(`Целевые SVG-сигнатуры не найдены: ${JSON.stringify(diagnostic)}`);
    }
    const cdp = await context.newCDPSession(page);
    await cdp.send('Accessibility.enable');
    for (const target of targets) {
      const item = found.find((candidate) => candidate.groupId === target.id);
      if (!item?.found || !('auditId' in item)) {
        observations.push({ groupId: target.id, expectedPurpose: target.purpose, expectedSvgSignature: target.svg, matches: item?.matches ?? 0, found: false, url: sanitizeUrl(page.url()), tag: '', domPath: '', outerHtml: '', computedRole: '', computedName: '', computedDescription: '', axIgnored: true, axStates: {}, svg: { signature: target.svg, viewBox: '', paths: [], title: '' }, parentContext: { tag: '', widget: '', text: '', productName: '', productPath: '' }, attributes: {}, eventListeners: [], ancestorEventListeners: [], conclusion: 'Совпадающий элемент на живой странице не найден.' });
        continue;
      }
      const foundItem = item as {
        groupId: string; matches: number; found: true; auditId: string; domPath: string; outerHtml: string;
        svg: { signature: string; viewBox: string; paths: string[]; title: string };
        parentContext: { tag: string; widget: string; text: string; productName: string; productPath: string };
        attributes: Record<string, string | boolean | null>;
      };
      const expression = `document.querySelector('[data-ozon-target-id="${foundItem.auditId}"]')`;
      const accessibility = await ax(cdp, expression);
      const direct = await listeners(cdp, expression);
      const ancestorEventListeners = [];
      for (let level = 1; level <= 4; level += 1) {
        const ancestorExpression = `${expression}${'.parentElement'.repeat(level)}`;
        ancestorEventListeners.push({ level, tag: await page.locator(`[data-ozon-target-id="${foundItem.auditId}"]`).evaluate((button, depth) => { let node: Element | null = button; for (let i = 0; i < depth; i += 1) node = node?.parentElement ?? null; return node?.tagName.toLowerCase() ?? ''; }, level), listeners: await listeners(cdp, ancestorExpression) });
      }
      const observation: TargetGroupObservation = {
        groupId: target.id, expectedPurpose: target.purpose, expectedSvgSignature: target.svg, matches: foundItem.matches, found: true,
        url: sanitizeUrl(page.url()), tag: 'button', domPath: foundItem.domPath, outerHtml: sanitizeHtml(foundItem.outerHtml),
        computedRole: accessibility.role, computedName: truncate(accessibility.name), computedDescription: truncate(accessibility.description), axIgnored: accessibility.ignored, axStates: accessibility.states,
        svg: foundItem.svg, parentContext: { ...foundItem.parentContext, text: truncate(foundItem.parentContext.text, 500), productName: truncate(foundItem.parentContext.productName, 300), productPath: sanitizeUrl(foundItem.parentContext.productPath) },
        attributes: foundItem.attributes, eventListeners: direct, ancestorEventListeners,
        conclusion: 'Пассивные признаки собраны; назначение требует оценки результата.',
      };
      if (allowArrowInteractions && ['element-group-008', 'element-group-009'].includes(target.id)) observation.interaction = await arrowInteraction(page, foundItem.auditId);
      observations.push(observation);
    }
    await cdp.detach();
  } catch (error) { errors.push(String(error)); }
  finally {
    await context?.close().catch(() => undefined);
    if (profile.startsWith(resolve(tmpdir(), 'ozon-access-targeted-'))) await rm(profile, { recursive: true, force: true });
  }
  return { mode: 'live-groups', generatedAt: new Date().toISOString(), source: 'https://www.ozon.ru/', requestedGroups: groupIds, arrowInteractionsAllowed: allowArrowInteractions, observations, errors, limitations: ['Исследован только первый видимый экземпляр каждой SVG-группы.', 'Кнопка избранного никогда не нажимается.', allowArrowInteractions ? 'Стрелки нажимаются только с защитой от перехода по товарной ссылке.' : 'Выполнен только пассивный анализ; элементы не нажимались.'] };
}

export async function writeTargetedReport(result: TargetedAuditResult, outputDirectory: string): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, 'targeted-groups.json'), JSON.stringify(result, null, 2), 'utf8');
  const lines = ['# Ограниченный live-аудит групп', '', `Время: ${result.generatedAt}. Нажатия стрелок: ${result.arrowInteractionsAllowed ? 'разрешены' : 'не разрешены'}.`, ''];
  for (const item of result.observations) lines.push(`## ${item.groupId}`, '', `- Найден: ${item.found ? 'да' : 'нет'}; совпадений: ${item.matches}.`, `- Ожидалось: ${item.expectedPurpose}.`, `- Роль / имя: ${item.computedRole || '—'} / ${item.computedName || 'без имени'}.`, `- Товар: ${item.parentContext.productName || 'не определён'}.`, `- Обработчики: ${item.eventListeners.join(', ') || 'прямые не обнаружены'}; предки: ${item.ancestorEventListeners.flatMap((entry) => entry.listeners).join(', ') || 'не обнаружены'}.`, `- Состояния: ${JSON.stringify({ ...item.axStates, ...item.attributes })}.`, `- Взаимодействие: ${item.interaction ? JSON.stringify(item.interaction) : 'не выполнялось'}.`, '');
  if (result.errors.length) lines.push('## Ошибки', '', ...result.errors.map((error) => `- ${error}`), '');
  await writeFile(resolve(outputDirectory, 'summary.md'), lines.join('\n'), 'utf8');
}
