import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { beforeEach, describe, expect, it } from 'vitest';
import { heuristicTextAlternative } from '../src/core/accessibility';
import { observeAddedContent } from '../src/core/observer';
import { improveButtons } from '../src/sites/ozon/buttons';
import { improveAuth } from '../src/sites/ozon/auth';
import { improveCart } from '../src/sites/ozon/cart';
import { improveFilters } from '../src/sites/ozon/filters';
import { improveProducts } from '../src/sites/ozon/products';
import { improveStructure } from '../src/sites/ozon/structure';

function installDom(html: string): Document {
  const virtualConsole = new VirtualConsole();
  const window = new JSDOM(html, { url: 'https://www.ozon.ru/', virtualConsole }).window;
  Object.assign(globalThis, {
    window,
    document: window.document,
    Element: window.Element,
    Document: window.Document,
    HTMLElement: window.HTMLElement,
    HTMLInputElement: window.HTMLInputElement,
    KeyboardEvent: window.KeyboardEvent,
    MutationObserver: window.MutationObserver,
    CSS: window.CSS,
  });
  return window.document;
}

describe('правила OzonAccess', () => {
  let fixture: string;
  beforeEach(() => { fixture = readFileSync(resolve('tests/fixtures/ozon-minimal.html'), 'utf8'); });

  it('исправляет подтверждённые проблемы сохранённого DOM идемпотентно', () => {
    const document = installDom(fixture);
    const productLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]')];
    expect(productLinks).toHaveLength(4);
    expect(productLinks.filter((link) => !heuristicTextAlternative(link))).toHaveLength(2);

    improveButtons(document);
    improveProducts(document);
    improveStructure(document);
    const changedOnce = document.querySelectorAll('[data-ozon-access="true"]').length;
    improveButtons(document);
    improveProducts(document);
    improveStructure(document);

    expect(document.querySelectorAll('[data-ozon-access="true"]').length).toBe(changedOnce);
    expect(productLinks.filter((link) => !heuristicTextAlternative(link))).toHaveLength(0);
    expect(document.querySelectorAll('[role="heading"][aria-level="2"]')).toHaveLength(2);
    expect(document.querySelectorAll('[role="main"]')).toHaveLength(1);
    expect(document.querySelector('[role="main"] footer')).toBeNull();
    expect(document.querySelector('input[placeholder*="Ozon"] + * button[aria-label="Поиск по изображению"]')).not.toBeNull();
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-widget="tileGridDesktop"] button')];
    const previous = buttons.filter((button) => button.querySelector('path')?.getAttribute('d')?.startsWith('M8.293 3.293'));
    const next = buttons.filter((button) => button.querySelector('path')?.getAttribute('d')?.startsWith('M6.293 3.293'));
    expect(previous).toHaveLength(2);
    expect(next).toHaveLength(2);
    expect(previous.every((button) => button.getAttribute('aria-label')?.startsWith('Предыдущее фото товара «'))).toBe(true);
    expect(next.every((button) => button.getAttribute('aria-label')?.startsWith('Следующее фото товара «'))).toBe(true);
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

  it('подписывает подтверждённые стрелки фотографий названием товара и не трогает избранное', () => {
    const previous = 'M8.293 3.293a1 1 0 1 1 1.414 1.414L6.414 8l3.293 3.293a1 1 0 1 1-1.414 1.414l-4-4a1 1 0 0 1 0-1.414z';
    const next = 'M6.293 3.293a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 1 1-1.414-1.414L9.586 8 6.293 4.707a1 1 0 0 1 0-1.414';
    const document = installDom(`<div data-widget="tileGridDesktop"><a href="/product/a-1/"><button id="previous"><svg><path d="${previous}"/></svg></button><button id="next"><svg><path d="${next}"/></svg></button></a><a href="/product/a-1/"><span>Товар A</span></a><button id="favorite"><svg><path d="M7 5"/></svg></button></div>`);
    improveButtons(document);
    expect(document.querySelector('#previous')?.getAttribute('aria-label')).toBe('Предыдущее фото товара «Товар A»');
    expect(document.querySelector('#next')?.getAttribute('aria-label')).toBe('Следующее фото товара «Товар A»');
    expect(document.querySelector('#favorite')?.hasAttribute('aria-label')).toBe(false);
  });

  it('сохраняет существующее имя стрелки фотографии', () => {
    const path = 'M8.293 3.293a1 1 0 1 1 1.414 1.414L6.414 8l3.293 3.293a1 1 0 1 1-1.414 1.414l-4-4a1 1 0 0 1 0-1.414z';
    const document = installDom(`<div data-widget="tileGridDesktop"><a href="/product/a-1/"><button aria-label="Назад"><svg><path d="${path}"/></svg></button></a><a href="/product/a-1/">Товар A</a></div>`);
    improveButtons(document);
    expect(document.querySelector('button')?.getAttribute('aria-label')).toBe('Назад');
  });

  it('обрабатывает стрелки в динамически добавленной карточке внутри сетки', () => {
    const path = 'M6.293 3.293a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 1 1-1.414-1.414L9.586 8 6.293 4.707a1 1 0 0 1 0-1.414';
    const document = installDom(`<div data-widget="tileGridDesktop"><div id="card"><a href="/product/a-1/"><button><svg><path d="${path}"/></svg></button></a><a href="/product/a-1/">Динамический товар</a></div></div>`);
    improveButtons(document.querySelector('#card')!);
    expect(document.querySelector('button')?.getAttribute('aria-label')).toBe('Следующее фото товара «Динамический товар»');
  });

  it('подписывает и обновляет подтверждённые состояния избранного', () => {
    const outline = 'M7 5a4 4 0 0 0-4 4c0 3.552 2.218 6.296 4.621 8.22A21.5 21.5 0 0 0 12 19.91a21.6 21.6 0 0 0 4.377-2.69C18.78 15.294 21 12.551 21 9a4 4 0 0 0-4-4c-1.957 0-3.652 1.396-4.02 3.2a1 1 0 0 1-1.96 0C10.652 6.396 8.957 5 7 5';
    const filled = 'M12 22c-.316-.02-.56-.147-.848-.278a23.5 23.5 0 0 1-4.781-2.942C3.777 16.705 1 13.449 1 9a6 6 0 0 1 6-6 6.18 6.18 0 0 1 5 2.568A6.18 6.18 0 0 1 17 3a6 6 0 0 1 6 6c0 4.448-2.78 7.705-5.375 9.78a23.6 23.6 0 0 1-4.78 2.942c-.543.249-.732.278-.845.278';
    const document = installDom(`<div data-widget="tileGridDesktop"><div><a href="/product/a-1/">Товар A</a><button><svg><path d="${outline}"/><path d="outline-detail"/></svg></button></div></div>`);
    const button = document.querySelector('button')!;
    improveButtons(document);
    expect(button.getAttribute('aria-label')).toBe('Избранное для товара «Товар A»');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    button.innerHTML = `<svg><path d="${filled}" fill="#F8104B"/></svg>`;
    improveButtons(button.querySelector('path')!);
    expect(button.getAttribute('aria-label')).toBe('Избранное для товара «Товар A»');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('обновляет состояние избранного через MutationObserver без цикла собственных изменений', async () => {
    const outline = 'M7 5a4 4 0 0 0-4 4c0 3.552 2.218 6.296 4.621 8.22A21.5 21.5 0 0 0 12 19.91a21.6 21.6 0 0 0 4.377-2.69C18.78 15.294 21 12.551 21 9a4 4 0 0 0-4-4c-1.957 0-3.652 1.396-4.02 3.2a1 1 0 0 1-1.96 0C10.652 6.396 8.957 5 7 5';
    const filled = 'M12 22c-.316-.02-.56-.147-.848-.278a23.5 23.5 0 0 1-4.781-2.942C3.777 16.705 1 13.449 1 9a6 6 0 0 1 6-6 6.18 6.18 0 0 1 5 2.568A6.18 6.18 0 0 1 17 3a6 6 0 0 1 6 6c0 4.448-2.78 7.705-5.375 9.78a23.6 23.6 0 0 1-4.78 2.942c-.543.249-.732.278-.845.278';
    const document = installDom(`<div data-widget="tileGridDesktop"><div><a href="/product/a-1/">Товар A</a><button><svg><path d="${outline}"/><path id="detail" d="outline-detail"/></svg></button></div></div>`);
    let runs = 0;
    const observer = observeAddedContent(document, (root) => { runs += 1; improveButtons(root); });
    improveButtons(document);
    const button = document.querySelector('button')!;
    const path = document.querySelector('path')!;
    document.querySelector('#detail')?.remove();
    path.setAttribute('d', filled);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    expect(button.getAttribute('aria-pressed')).toBe('true');
    const stableRuns = runs;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    expect(runs).toBe(stableRuns);
    path.setAttribute('d', outline);
    path.insertAdjacentHTML('afterend', '<path d="outline-detail"/>');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Избранное для товара «Товар A»');
    observer.disconnect();
  });

  it('добавляет имена фильтрам и сортировке из видимых подписей', () => {
    const document = installDom('<div data-widget="filtersDesktop"><div><label><input id="brand" type="checkbox"></label></div><span>Бренд проверен</span><div><input id="from" type="text"><span>от</span></div></div><input id="sort" readonly value="Популярные">');
    improveFilters(document);
    expect(document.querySelector('#brand')?.getAttribute('aria-label')).toBe('Бренд проверен');
    expect(document.querySelector('#from')?.getAttribute('aria-label')).toBe('Цена от');
    expect(document.querySelector('#sort')?.getAttribute('aria-label')).toBe('Сортировка товаров');
  });

  it('подписывает управление корзиной названием товара', () => {
    const document = installDom('<div data-widget="header"><div><div><div>Корзина</div><span>1</span></div></div></div><div data-widget="controls"><input type="checkbox"><button id="delete-all"><svg><path d="M13 6.333c.417 0 .833.235.833.834 rest"/></svg></button></div><div data-widget="cartSplit"><a href="/product/a-1/">Товар A</a><input id="item" type="checkbox"><button id="delete"><svg><path d="M13 6.333c.417 0 .833.235.833.834 rest"/></svg></button><button id="minus"><svg><path d="M13.416 6.75a1.25 1.25 0 0 1 0 2.5 rest"/></svg></button><input id="quantity" type="text" value="1"><button id="plus"><svg><path d="M8 1.333c.69 0 1.25.56 1.25 1.25 rest"/></svg></button></div>');
    improveCart(document);
    expect(document.querySelector('[data-widget="controls"] input')?.getAttribute('aria-label')).toBe('Выбрать все товары');
    expect(document.querySelector('#delete-all')?.getAttribute('aria-label')).toBe('Удалить выбранные товары');
    expect(document.querySelector('#item')?.getAttribute('aria-label')).toBe('Выбрать товар «Товар A»');
    expect(document.querySelector('#quantity')?.getAttribute('aria-label')).toBe('Количество товара «Товар A»');
    expect(document.querySelector('#minus')?.getAttribute('aria-label')).toBe('Уменьшить количество товара «Товар A»');
    expect(document.querySelector('#plus')?.getAttribute('aria-label')).toBe('Увеличить количество товара «Товар A»');
    expect(document.querySelector('#delete')?.getAttribute('aria-label')).toBe('Удалить товар «Товар A»');
    expect(document.querySelector('[data-widget="header"] [role="heading"]')?.getAttribute('aria-level')).toBe('1');
  });

  it('не смешивает названия разных позиций корзины', () => {
    const item = (id: string, name: string) => `<section><a href="/product/${id}/">${name}</a><input id="check-${id}" type="checkbox"><button id="delete-${id}"><svg><path d="M13 6.333c.417 0 .833.235.833.834 rest"/></svg></button><input id="quantity-${id}" type="text"><button id="plus-${id}"><svg><path d="M8 1.333c.69 0 1.25.56 1.25 1.25 rest"/></svg></button></section>`;
    const document = installDom(`<div data-widget="cartSplit">${item('a-1', 'Товар A')}${item('b-2', 'Товар B')}</div>`);
    improveCart(document);
    expect(document.querySelector('#check-a-1')?.getAttribute('aria-label')).toBe('Выбрать товар «Товар A»');
    expect(document.querySelector('#delete-a-1')?.getAttribute('aria-label')).toBe('Удалить товар «Товар A»');
    expect(document.querySelector('#quantity-b-2')?.getAttribute('aria-label')).toBe('Количество товара «Товар B»');
    expect(document.querySelector('#plus-b-2')?.getAttribute('aria-label')).toBe('Увеличить количество товара «Товар B»');
  });

  it('улучшает родительский iframe и содержимое авторизации', () => {
    const parent = installDom('<div class="modal-shell"><button id="close"><svg></svg></button><div data-widget="modalLayout"><iframe src="/ozonid-lite"></iframe></div></div>');
    improveAuth(parent);
    expect(parent.querySelector('iframe')?.getAttribute('title')).toBe('Авторизация Ozon');
    expect(parent.querySelector('#close')?.getAttribute('aria-label')).toBe('Закрыть окно авторизации');
    const frame = installDom('<main><div>Введите номер телефона</div><input type="tel"><p>Некорректный формат телефона</p></main>');
    improveAuth(frame);
    expect(frame.querySelector('input')?.getAttribute('aria-label')).toBe('Номер телефона');
    expect(frame.querySelector('input')?.getAttribute('aria-describedby')).toBe('ozon-access-phone-error');
    expect(frame.querySelector('p')?.getAttribute('role')).toBe('alert');
  });

  it('подписывает флажки согласия, не меняя их состояние', () => {
    const document = installDom('<main><div><div><label><input type="checkbox" checked></label></div><div>Соглашаюсь с Условиями использования сервисов Ozon и Условиями обработки персональных данных</div></div><div><div><label><input type="checkbox"></label></div><div>Соглашаюсь на получение сообщений рекламного характера</div></div></main>');
    improveAuth(document);
    const [terms, ads] = [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(terms.getAttribute('aria-label')).toBe('Соглашаюсь с Условиями использования сервисов Ozon и Условиями обработки персональных данных');
    expect(ads.getAttribute('aria-label')).toBe('Соглашаюсь на получение сообщений рекламного характера');
    expect(terms.checked).toBe(true);
    expect(ads.checked).toBe(false);
  });

  it('не подменяет нативные кнопки создания и входа в аккаунт', () => {
    const document = installDom('<main><button id="create">Создать аккаунт</button><button id="existing">Уже есть аккаунт</button></main>');
    const create = document.querySelector<HTMLButtonElement>('#create')!;
    const existing = document.querySelector<HTMLButtonElement>('#existing')!;
    improveAuth(document);
    expect(document.querySelector('#create')).toBe(create);
    expect(document.querySelector('#existing')).toBe(existing);
    expect(create.disabled).toBe(false);
    expect(existing.disabled).toBe(false);
    expect(create.hasAttribute('role')).toBe(false);
    expect(existing.hasAttribute('role')).toBe(false);
    expect(create.hasAttribute('data-ozon-access')).toBe(false);
    expect(existing.hasAttribute('data-ozon-access')).toBe(false);
  });

  it('создаёт нативную кнопку входа внутри штатной кликабельной ветки', () => {
    const document = installDom('<div data-widget="profileMenuAnonymous" tabindex="0"><div id="ozon-handler"><div id="icon-host"><svg><path d="profile"/></svg></div><span>Войти</span></div></div>');
    const profile = document.querySelector<HTMLElement>('[data-widget="profileMenuAnonymous"]')!;
    const ozonHandler = document.querySelector<HTMLElement>('#ozon-handler')!;
    let activations = 0;
    ozonHandler.addEventListener('click', () => { activations += 1; });

    improveButtons(document);
    const button = profile.querySelector<HTMLButtonElement>('button[data-ozon-access-profile-button]');
    expect(button?.getAttribute('aria-label')).toBe('Войти');
    expect(profile.hasAttribute('role')).toBe(false);
    expect(profile.hasAttribute('aria-label')).toBe(false);
    expect(profile.hasAttribute('tabindex')).toBe(false);

    button?.click();
    expect(activations).toBe(1);
    improveButtons(document);
    expect(profile.querySelectorAll('button[data-ozon-access-profile-button]')).toHaveLength(1);
  });

  it('связывает комбобокс страны со списком и выбранным пунктом', () => {
    const document = installDom('<main><div>Введите номер телефона</div><div><span>+7</span><input readonly role="combobox" name="filter"></div><input type="tel"><div id="popup"><div role="option" title="Россия"><svg></svg>Россия +7<svg></svg></div><div role="option" title="Беларусь"><svg></svg>Беларусь +375</div></div></main>');
    improveAuth(document);
    const combo = document.querySelector<HTMLInputElement>('[role="combobox"]')!;
    const listbox = document.querySelector<HTMLElement>('#popup')!;
    const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(combo.getAttribute('aria-label')).toBe('Выбор страны и телефонного кода, текущий код +7');
    expect(combo.getAttribute('aria-haspopup')).toBe('listbox');
    expect(combo.getAttribute('aria-controls')).toBe('popup');
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(listbox.getAttribute('aria-label')).toBe('Страны и телефонные коды');
    expect(options.map((option) => option.getAttribute('aria-selected'))).toEqual([null, null]);
  });

  it('передаёт активный вариант страны через aria-activedescendant', async () => {
    const document = installDom('<main><div>Введите номер телефона</div><div><span id="country-code">+7</span><input readonly role="combobox" name="filter"></div><input type="tel"><div id="popup"><div role="option" title="Россия" class="option active">Россия +7</div><div role="option" title="Беларусь" class="option">Беларусь +375</div></div></main>');
    const combo = document.querySelector<HTMLInputElement>('[role="combobox"]')!;
    const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
    combo.addEventListener('keydown', (event) => {
      const current = options.findIndex((option) => option.classList.contains('active'));
      const next = event.key === 'ArrowDown' ? Math.min(current + 1, options.length - 1)
        : event.key === 'ArrowUp' ? Math.max(current - 1, 0) : current;
      options[current]?.classList.remove('active');
      options[next]?.classList.add('active');
    });
    improveAuth(document);
    combo.focus();

    combo.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    expect(combo.ownerDocument.activeElement).toBe(combo);
    expect(combo.getAttribute('aria-activedescendant')).toBe(options[1].id);
    expect(options[1].textContent).toContain('Беларусь');
    expect(options.map((option) => option.getAttribute('aria-selected'))).toEqual([null, null]);
    expect(document.querySelector('#country-code')?.textContent).toBe('+7');

    combo.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    expect(combo.getAttribute('aria-activedescendant')).toBe(options[0].id);
  });

  it('возвращает фокус после Enter и Escape, не подменяя выбор страны', async () => {
    const checkClose = async (key: 'Enter' | 'Escape', selectedCode: string) => {
      const document = installDom('<main><div>Введите номер телефона</div><div><span id="country-code">+7</span><input readonly role="combobox" name="filter"></div><input type="tel"><div id="popup"><div role="option" title="Россия" class="option active">Россия +7</div><div role="option" title="Беларусь" class="option">Беларусь +375</div></div></main>');
      const combo = document.querySelector<HTMLInputElement>('[role="combobox"]')!;
      combo.addEventListener('keydown', () => {
        setTimeout(() => {
          document.querySelector('#popup')?.remove();
          document.querySelector('#country-code')!.textContent = selectedCode;
          combo.blur();
        }, 5);
      });
      improveAuth(document);
      const observer = observeAddedContent(document, improveAuth);
      combo.focus();
      combo.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
      expect(combo.ownerDocument.activeElement).toBe(document.querySelector('input[type="tel"]'));
      expect(combo.hasAttribute('aria-activedescendant')).toBe(false);
      expect(combo.hasAttribute('aria-controls')).toBe(false);
      expect(document.querySelector('#country-code')?.textContent).toBe(selectedCode);
      observer.disconnect();
    };

    await checkClose('Escape', '+7');
    await checkClose('Enter', '+375');
  });

  it('сохраняет авторские доступные имена', () => {
    const document = installDom('<span id="search-name">Авторский поиск</span><input name="text" type="text" placeholder="Ozon" aria-labelledby="search-name"><button aria-label="Авторское имя"><svg><path d="M8.293 3.293a1 1 0 1 1 1.414 1.414L6.414 8l3.293 3.293a1 1 0 1 1-1.414 1.414l-4-4a1 1 0 0 1 0-1.414z"/></svg></button>');
    improveButtons(document);
    expect(document.querySelector('input')?.hasAttribute('aria-label')).toBe(false);
    expect(document.querySelector('button')?.getAttribute('aria-label')).toBe('Авторское имя');
  });

  it('создаёт заголовки для пустого поиска и гостевого кабинета', () => {
    const document = installDom('<div data-widget="wallpaper"><div data-widget="statusWidget"><div><span>Ничего не нашлось</span></div></div><div data-widget="myGuest"><div>Вы не авторизованы</div></div></div>');
    improveStructure(document);
    expect(document.querySelector('[data-widget="wallpaper"]')?.getAttribute('role')).toBe('main');
    expect(document.querySelector('[data-widget="statusWidget"] [role="heading"]')?.getAttribute('aria-level')).toBe('1');
    expect(document.querySelector('[data-widget="myGuest"] [role="heading"]')?.getAttribute('aria-level')).toBe('1');
  });

  it('обрабатывает динамически добавленную карточку', async () => {
    const document = installDom('<div id="root"></div>');
    const observer = observeAddedContent(document, improveProducts);
    document.querySelector('#root')!.insertAdjacentHTML('beforeend', '<div data-widget="tileGridDesktop"><a href="/product/b-2/"><img alt=""></a><a href="/product/b-2/"><span>Новый товар</span></a></div>');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    expect(document.querySelector('a')?.getAttribute('aria-label')).toBe('Новый товар');
    observer.disconnect();
  });

  it('передаёт наблюдателю изменения текста и значимых атрибутов', async () => {
    const document = installDom('<div id="target" title="старое">Старый текст</div>');
    const seen: ParentNode[] = [];
    const observer = observeAddedContent(document, (root) => { seen.push(root); });
    const target = document.querySelector('#target')!;
    target.firstChild!.textContent = 'Новый текст';
    target.setAttribute('title', 'новое');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    expect(seen).toContain(target);
    observer.disconnect();
  });
});
