import { describe, expect, it } from 'vitest';
import { buildGroups, classify, fingerprint } from '../tools/audit/classify';
import { sanitizeHtml, sanitizeUrl } from '../tools/audit/privacy';
import type { ElementRecord } from '../tools/audit/types';

function record(overrides: Partial<ElementRecord> = {}): ElementRecord {
  return {
    id: 'x', state: 'before', frame: 'main', tag: 'button', domPath: 'body > button', selectors: [], outerHtml: '', text: '',
    computedRole: 'button', computedName: '', computedDescription: '', axIgnored: false, axStates: {}, ariaLabel: '', ariaLabelledby: '', title: '', alt: '', tabindex: 0, href: '',
    svg: { count: 1, title: '', viewBox: '0 0 24 24', pathCount: 1, signature: 'heart' },
    parentContext: { tag: 'div', widget: 'tileGridDesktop', text: 'Товар' }, visible: true, disabled: false,
    bounds: { x: 0, y: 0, width: 24, height: 24 }, focusable: true, interactiveSource: ['native'], eventListeners: ['click'], ancestorEventListeners: [],
    componentGroup: '', groupFingerprint: '', purpose: '', evidence: '', confidence: 'unknown', safety: 'manual-review', ...overrides,
  };
}

describe('анализатор аудита', () => {
  it('группирует одинаковую структуру без использования CSS-класса', () => {
    const first = record({ id: 'a', outerHtml: '<button class="random-a">' });
    const second = record({ id: 'b', outerHtml: '<button class="random-b">' });
    classify(first); classify(second);
    expect(fingerprint(first)).toBe(fingerprint(second));
    const groups = buildGroups([first, second]);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
  });

  it('отделяет предположение о товарной SVG-кнопке от подтверждённого факта', () => {
    const arrow = record({ svg: { count: 1, title: '', viewBox: '', pathCount: 1, signature: 'c5aa4ed8f578' } });
    const favorite = record({ svg: { count: 1, title: '', viewBox: '', pathCount: 2, signature: 'cda97bf95b0b' } });
    classify(arrow); classify(favorite);
    expect(arrow.confidence).toBe('confirmed');
    expect(arrow.safety).toBe('manual-review');
    expect(favorite.confidence).toBe('confirmed');
    expect(favorite.safety).toBe('forbidden');
  });

  it('редактирует параметры URL и потенциально чувствительные атрибуты HTML', () => {
    expect(sanitizeUrl('https://www.ozon.ru/product/a/?token=secret')).toBe('/product/a/');
    expect(sanitizeHtml('<a href="/x?token=secret" data-token="secret">X</a>')).not.toContain('secret');
  });
});
