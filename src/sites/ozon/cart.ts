import { elementsIn, heuristicTextAlternative, productPath, setGeneratedAttribute } from '../../core/accessibility';

const DELETE_PATH = 'M13 6.333c.417 0 .833.235.833.834';
const MINUS_PATH = 'M13.416 6.75a1.25 1.25 0 0 1 0 2.5';
const PLUS_PATH = 'M8 1.333c.69 0 1.25.56 1.25 1.25';

function distinctProducts(container: Element): string[] {
  return [...new Set([...container.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]')]
    .map((link) => productPath(link.getAttribute('href') ?? ''))
    .filter((path): path is string => Boolean(path)))];
}

function itemBoundary(control: Element, cart: Element): Element | null {
  for (let current = control.parentElement; current && current !== cart; current = current.parentElement) {
    if (distinctProducts(current).length === 1) return current;
  }
  return distinctProducts(cart).length === 1 ? cart : null;
}

function productNameForControl(control: Element, cart: Element): string {
  const boundary = itemBoundary(control, cart);
  if (!boundary) return '';
  const link = [...boundary.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]')]
    .find((candidate) => Boolean(heuristicTextAlternative(candidate)));
  return link ? heuristicTextAlternative(link) : '';
}

export function improveCart(root: ParentNode): void {
  const controls = root instanceof Element && root.closest('[data-widget="controls"]')
    ? [root.closest('[data-widget="controls"]') as Element]
    : elementsIn(root, '[data-widget="controls"]');
  for (const container of controls) {
    const selectAll = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (selectAll) setGeneratedAttribute(selectAll, 'aria-label', 'Выбрать все товары');
    for (const button of container.querySelectorAll<HTMLButtonElement>('button')) {
      const path = button.querySelector('path')?.getAttribute('d') ?? '';
      if (path.startsWith(DELETE_PATH)) setGeneratedAttribute(button, 'aria-label', 'Удалить выбранные товары');
    }
  }

  const items = root instanceof Element && root.closest('[data-widget="cartSplit"]')
    ? [root.closest('[data-widget="cartSplit"]') as Element]
    : elementsIn(root, '[data-widget="cartSplit"]');
  for (const cart of items) {
    for (const checkbox of cart.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
      const name = productNameForControl(checkbox, cart);
      if (name) setGeneratedAttribute(checkbox, 'aria-label', `Выбрать товар «${name}»`);
    }
    for (const quantity of cart.querySelectorAll<HTMLInputElement>('input[type="text"]')) {
      const name = productNameForControl(quantity, cart);
      if (name) setGeneratedAttribute(quantity, 'aria-label', `Количество товара «${name}»`);
    }
    for (const button of cart.querySelectorAll<HTMLButtonElement>('button')) {
      const name = productNameForControl(button, cart);
      if (!name) continue;
      const path = button.querySelector('path')?.getAttribute('d') ?? '';
      if (path.startsWith(DELETE_PATH)) setGeneratedAttribute(button, 'aria-label', `Удалить товар «${name}»`);
      if (path.startsWith(MINUS_PATH)) setGeneratedAttribute(button, 'aria-label', `Уменьшить количество товара «${name}»`);
      if (path.startsWith(PLUS_PATH)) setGeneratedAttribute(button, 'aria-label', `Увеличить количество товара «${name}»`);
    }
  }

  for (const header of elementsIn(root, '[data-widget="header"]')) {
    if (header.closest('header')) continue;
    const title = [...header.querySelectorAll<HTMLElement>('div, span')]
      .find((element) => element.children.length === 0 && /^Корзина$/i.test(element.textContent?.trim() ?? ''));
    if (title) {
      setGeneratedAttribute(title, 'role', 'heading');
      setGeneratedAttribute(title, 'aria-level', '1');
    }
  }
}
