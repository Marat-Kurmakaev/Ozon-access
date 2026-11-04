import AxeBuilder from '@axe-core/playwright';
import type { CDPSession, Page } from '@playwright/test';
import { buildGroups, classify, shortHash } from './classify';
import { redactSensitiveText, sanitizeHtml, sanitizeUrl, truncate } from './privacy';
import type { AuditResult, BehaviorResult, ElementRecord, KeyboardResult } from './types';

interface DomRecord {
  id: string; frame: string; tag: string; domPath: string; selectors: string[]; outerHtml: string; text: string;
  ariaLabel: string; ariaLabelledby: string; title: string; alt: string; tabindex: number | null; href: string;
  svgRaw: string; svgTitle: string; svgViewBox: string; svgCount: number; svgPathCount: number;
  parentTag: string; parentWidget: string; parentText: string; visible: boolean; disabled: boolean;
  bounds: { x: number; y: number; width: number; height: number } | null; focusable: boolean; interactiveSource: string[];
}

type AxValue = { value?: string | number | boolean } | undefined;
type AxNode = { ignored?: boolean; role?: AxValue; name?: AxValue; description?: AxValue; properties?: Array<{ name: string; value?: AxValue }>; nodeId?: string; parentId?: string };

function axValue(value: AxValue): string | number | boolean {
  return value?.value ?? '';
}

async function registerElements(page: Page, state: string): Promise<DomRecord[]> {
  // tsx annotates nested functions with this helper; expose a no-op in the isolated page world.
  await page.evaluate('globalThis.__name = target => target');
  return page.evaluate((stateName) => {
    const registry: Element[] = [];
    const output: DomRecord[] = [];
    const seen = new Set<Element>();
    const text = (value: string | null | undefined, max = 500) => (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
    const domPath = (element: Element) => {
      const parts: string[] = [];
      let current: Element | null = element;
      while (current && parts.length < 10) {
        let part = current.tagName.toLowerCase();
        if (current.id && !/token|session|user/i.test(current.id)) { part += `#${CSS.escape(current.id)}`; parts.unshift(part); break; }
        const parent: Element | null = current.parentElement;
        if (parent) {
          const siblings = [...parent.children].filter((item) => item.tagName === current!.tagName);
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
        parts.unshift(part);
        current = parent;
      }
      return parts.join(' > ');
    };
    const candidate = (element: Element) => {
      const style = getComputedStyle(element);
      return element.matches('a[href],button,input,select,textarea,summary,main,nav,header,footer,h1,h2,h3,h4,h5,h6,[role],[tabindex],[onclick],[contenteditable="true"],audio[controls],video[controls]') || style.cursor === 'pointer';
    };
    const collectRoot = (root: Document | ShadowRoot, frame: string) => {
      for (const element of root.querySelectorAll('*')) {
        if (seen.has(element)) continue;
        seen.add(element);
        if (candidate(element)) {
          const index = registry.push(element) - 1;
          const id = `${stateName}-element-${String(index + 1).padStart(4, '0')}`;
          element.setAttribute('data-ozon-audit-id', id);
          const html = element as HTMLElement;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          const widget = element.closest('[data-widget]');
          const svgElements = [...element.querySelectorAll('svg')];
          const paths = svgElements.flatMap((svg) => [...svg.querySelectorAll('path')].map((path) => path.getAttribute('d') ?? ''));
          const sources: string[] = [];
          if (element.matches('a[href],button,input,select,textarea,summary')) sources.push('native');
          if (element.hasAttribute('role')) sources.push('role');
          if (element.hasAttribute('tabindex')) sources.push('tabindex');
          if (element.hasAttribute('onclick')) sources.push('inline-listener');
          if (style.cursor === 'pointer') sources.push('pointer-cursor');
          const selectors = [`[data-ozon-audit-id="${id}"]`];
          if (element.id && !/token|session|user/i.test(element.id)) selectors.push(`#${CSS.escape(element.id)}`);
          if (element.getAttribute('data-widget')) selectors.push(`[data-widget="${element.getAttribute('data-widget')}"]`);
          output.push({
            id, frame, tag: element.tagName.toLowerCase(), domPath: domPath(element), selectors,
            outerHtml: element.outerHTML, text: text(element.textContent),
            ariaLabel: element.getAttribute('aria-label') ?? '', ariaLabelledby: element.getAttribute('aria-labelledby') ?? '',
            title: element.getAttribute('title') ?? '', alt: element.getAttribute('alt') ?? element.querySelector('img[alt]')?.getAttribute('alt') ?? '',
            tabindex: element.hasAttribute('tabindex') ? Number(element.getAttribute('tabindex')) : null,
            href: element instanceof HTMLAnchorElement ? element.href : '',
            svgRaw: paths.join('|'), svgTitle: text(svgElements.map((svg) => svg.querySelector('title')?.textContent ?? '').join(' '), 200),
            svgViewBox: svgElements[0]?.getAttribute('viewBox') ?? '', svgCount: svgElements.length, svgPathCount: paths.length,
            parentTag: element.parentElement?.tagName.toLowerCase() ?? '', parentWidget: widget?.getAttribute('data-widget') ?? '',
            parentText: text(widget?.textContent ?? element.parentElement?.textContent, 300),
            visible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.width > 0 && rect.height > 0,
            disabled: html.matches(':disabled,[aria-disabled="true"]'),
            bounds: rect.width || rect.height ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
            focusable: html.tabIndex >= 0 && !html.matches(':disabled,[aria-disabled="true"]'), interactiveSource: sources,
          });
        }
        if (element.shadowRoot) collectRoot(element.shadowRoot, `${frame}/shadow:${element.tagName.toLowerCase()}`);
        if (element instanceof HTMLIFrameElement) {
          try { if (element.contentDocument) collectRoot(element.contentDocument, `${frame}/iframe`); } catch { /* cross-origin iframe */ }
        }
      }
    };
    collectRoot(document, 'main');
    Object.defineProperty(window, '__ozonAuditElements', { value: registry, configurable: true });
    return output;
  }, state);
}

async function listenersFor(cdp: CDPSession, expression: string): Promise<string[]> {
  try {
    const evaluated = await cdp.send('Runtime.evaluate', { expression, returnByValue: false });
    if (!evaluated.result.objectId) return [];
    const result = await cdp.send('DOMDebugger.getEventListeners', { objectId: evaluated.result.objectId });
    return [...new Set(result.listeners.map((listener) => listener.type))].sort();
  } catch { return []; }
}

async function axFor(cdp: CDPSession, index: number): Promise<{ role: string; name: string; description: string; ignored: boolean; states: Record<string, string | number | boolean> }> {
  try {
    const evaluated = await cdp.send('Runtime.evaluate', { expression: `window.__ozonAuditElements[${index}]`, returnByValue: false });
    if (!evaluated.result.objectId) throw new Error('object unavailable');
    const tree = await cdp.send('Accessibility.queryAXTree', { objectId: evaluated.result.objectId });
    const node = tree.nodes[0] as AxNode | undefined;
    const states: Record<string, string | number | boolean> = {};
    for (const property of node?.properties ?? []) states[property.name] = axValue(property.value);
    return { role: String(axValue(node?.role)), name: String(axValue(node?.name)), description: String(axValue(node?.description)), ignored: node?.ignored ?? true, states };
  } catch { return { role: '', name: '', description: '', ignored: true, states: {} }; }
}

function renderCdpTree(nodes: AxNode[]): string {
  const children = new Map<string, AxNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const bucket = children.get(node.parentId) ?? [];
    bucket.push(node); children.set(node.parentId, bucket);
  }
  const roots = nodes.filter((node) => !node.parentId || !nodes.some((candidate) => candidate.nodeId === node.parentId));
  const lines: string[] = ['# CDP Accessibility.getFullAXTree'];
  const visit = (node: AxNode, depth: number) => {
    const role = String(axValue(node.role) || 'unknown');
    const name = truncate(String(axValue(node.name)), 160).replace(/"/g, '\\"');
    lines.push(`${'  '.repeat(depth)}- role: "${role}"; name: "${name}"; ignored: ${Boolean(node.ignored)}`);
    for (const child of children.get(node.nodeId ?? '') ?? []) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  return lines.join('\n');
}

export async function collectElements(page: Page, cdp: CDPSession, state: string): Promise<ElementRecord[]> {
  await cdp.send('Accessibility.enable');
  const dom = await registerElements(page, state);
  const output: ElementRecord[] = [];
  for (let index = 0; index < dom.length; index += 1) {
    const item = dom[index];
    const [ax, direct, ancestor] = await Promise.all([
      axFor(cdp, index), listenersFor(cdp, `window.__ozonAuditElements[${index}]`),
      listenersFor(cdp, `window.__ozonAuditElements[${index}]?.parentElement`),
    ]);
    const record: ElementRecord = {
      id: item.id, state, frame: item.frame, tag: item.tag, domPath: item.domPath, selectors: item.selectors,
      outerHtml: sanitizeHtml(item.outerHtml), text: truncate(item.text), computedRole: ax.role, computedName: truncate(ax.name),
      computedDescription: truncate(ax.description), axIgnored: ax.ignored, axStates: ax.states,
      ariaLabel: truncate(item.ariaLabel), ariaLabelledby: truncate(item.ariaLabelledby), title: truncate(item.title), alt: truncate(item.alt),
      tabindex: item.tabindex, href: sanitizeUrl(item.href),
      svg: { count: item.svgCount, title: item.svgTitle, viewBox: item.svgViewBox, pathCount: item.svgPathCount, signature: item.svgRaw ? shortHash(item.svgRaw) : '' },
      parentContext: { tag: item.parentTag, widget: item.parentWidget, text: truncate(item.parentText, 300) },
      visible: item.visible, disabled: item.disabled, bounds: item.bounds, focusable: item.focusable,
      interactiveSource: item.interactiveSource, eventListeners: direct, ancestorEventListeners: ancestor,
      componentGroup: '', groupFingerprint: '', purpose: '', evidence: '', confidence: 'unknown', safety: 'manual-review',
    };
    for (const [name, value] of Object.entries(record.axStates)) {
      if (typeof value === 'string' && (name === 'url' || /^https?:\/\//i.test(value))) record.axStates[name] = sanitizeUrl(value);
    }
    classify(record); output.push(record);
  }
  return output;
}

export async function collectAccessibilityTree(page: Page, cdp: CDPSession): Promise<{ text: string; count: number }> {
  let playwright = '';
  try { playwright = await page.locator('body').ariaSnapshot({ timeout: 10_000 }); } catch (error) { playwright = `ARIA snapshot unavailable: ${String(error)}`; }
  const full = await cdp.send('Accessibility.getFullAXTree');
  return { text: redactSensitiveText(`# Playwright ARIA snapshot\n${playwright}\n\n${renderCdpTree(full.nodes as AxNode[])}`), count: full.nodes.length };
}

export async function runAxe(page: Page): Promise<Record<string, unknown>> {
  try {
    const result = await new AxeBuilder({ page }).analyze();
    return {
      testEngine: result.testEngine, testEnvironment: result.testEnvironment,
      violations: result.violations.map((violation) => ({
        id: violation.id, impact: violation.impact, description: violation.description, help: violation.help, helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({ impact: node.impact, target: node.target, html: sanitizeHtml(node.html), failureSummary: truncate(node.failureSummary ?? '', 1000) })),
      })),
      passes: result.passes.map((pass) => ({ id: pass.id, impact: pass.impact, nodes: pass.nodes.length })),
      incomplete: result.incomplete.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })),
    };
  } catch (error) { return { error: String(error), violations: [] }; }
}

export async function testKeyboard(page: Page, elements: ElementRecord[]): Promise<KeyboardResult> {
  const focusable = elements.filter((item) => item.visible && item.focusable).length;
  const limit = Math.min(Math.max(focusable + 5, 20), 500);
  const tabStops: KeyboardResult['tabStops'] = [];
  const repeatedFocus: string[] = [];
  await page.locator('body').focus();
  let previous = '';
  let sameCount = 0;
  for (let order = 1; order <= limit; order += 1) {
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      return { id: element?.getAttribute('data-ozon-audit-id') ?? '', tag: element?.tagName.toLowerCase() ?? '', name: element?.getAttribute('aria-label') ?? (element?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) };
    });
    if (!active.id) break;
    const record = elements.find((item) => item.id === active.id);
    tabStops.push({ order, id: active.id, tag: active.tag, role: record?.computedRole ?? '', name: record?.computedName || active.name });
    if (active.id === previous) sameCount += 1; else sameCount = 0;
    if (sameCount >= 2) { repeatedFocus.push(active.id); break; }
    if (order > 2 && active.id === tabStops[0]?.id) break;
    previous = active.id;
  }
  const reverseStops: string[] = [];
  for (let index = 0; index < Math.min(10, tabStops.length); index += 1) {
    await page.keyboard.press('Shift+Tab');
    reverseStops.push(await page.evaluate(() => document.activeElement?.getAttribute('data-ozon-audit-id') ?? ''));
  }
  return { tabStops, reverseStops, repeatedFocus, possibleTrap: repeatedFocus.length > 0,
    notes: ['Enter, Space и Escape автоматически не нажимались: fixture не доказывает безопасность действий.', 'Автоматическая последовательность Tab не заменяет проверку NVDA.'] };
}

export function assembleResult(mode: string, source: string, elements: ElementRecord[], accessibilityTree: string, axe: Record<string, unknown>, keyboard: KeyboardResult, behavior: BehaviorResult, limitations: string[]): AuditResult {
  return { mode, source, generatedAt: new Date().toISOString(), elements, groups: buildGroups(elements), accessibilityTree, axe, keyboard, behavior, limitations };
}
