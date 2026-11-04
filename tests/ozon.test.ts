import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { accessibleName } from '../src/core/accessibility';
import { observeAddedContent } from '../src/core/observer';
import { improveButtons } from '../src/sites/ozon/buttons';
import { improveProducts } from '../src/sites/ozon/products';
import { improveStructure } from '../src/sites/ozon/structure';

function installDom(html: string): Document {
  const virtualConsole = new VirtualConsole();
  const window = new JSDOM(html, { url: 'https://www.ozon.ru/', virtualConsole }).window;
  Object.assign(globalThis, {
    window,
    document: window.document,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    HTMLInputElement: window.HTMLInputElement,
    MutationObserver: window.MutationObserver,
    CSS: window.CSS,
  });
  return window.document;
}

describe('правила OzonAccess', () => {
  let fixture: string;
  beforeEach(() => { fixture = readFileSync(resolve('ozon-dom.html'), 'utf8'); });

  it('исправляет подтверждённые проблемы сохранённого DOM идемпотентно', () => {
    const document = installDom(fixture);
    const productLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]')];
    expect(productLinks).toHaveLength(140);
    expect(productLinks.filter((link) => !accessibleName(link))).toHaveLength(70);

    improveButtons(document);
    improveProducts(document);
    improveStructure(document);
    const changedOnce = document.querySelectorAll('[data-ozon-access="true"]').length;
    improveButtons(document);
    improveProducts(document);
    improveStructure(document);

    expect(document.querySelectorAll('[data-ozon-access="true"]').length).toBe(changedOnce);
    expect(productLinks.filter((link) => !accessibleName(link))).toHaveLength(0);
    expect(document.querySelectorAll('[role="heading"][aria-level="2"]')).toHaveLength(70);
    expect(document.querySelectorAll('[role="main"]')).toHaveLength(1);
    expect(document.querySelector('input[placeholder*="Ozon"] + * button[aria-label="Поиск по изображению"]')).not.toBeNull();
  });

  it('не удаляет существующие обработчики событий', () => {
    const document = installDom('<div data-widget="tileGridDesktop"><a href="/product/a-1/"><img alt=""></a><a href="/product/a-1/"><span>Товар</span></a></div>');
    const link = document.querySelector<HTMLAnchorElement>('a')!;
    let clicks = 0;
    link.addEventListener('click', (event) => { event.preventDefault(); clicks += 1; });
    improveProducts(document);
    link.click();
    expect(clicks).toBe(1);
    expect(link.getAttribute('aria-label')).toBe('Товар');
  });

  it('обрабатывает динамически добавленную карточку', async () => {
    const document = installDom('<div id="root"></div>');
    const observer = observeAddedContent(document, improveProducts);
    document.querySelector('#root')!.insertAdjacentHTML('beforeend', '<div data-widget="tileGridDesktop"><a href="/product/b-2/"><img alt=""></a><a href="/product/b-2/"><span>Новый товар</span></a></div>');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    expect(document.querySelector('a')?.getAttribute('aria-label')).toBe('Новый товар');
    observer.disconnect();
  });
});
