import { accessibleName, elementsIn, setGeneratedAttribute } from '../../core/accessibility';

const DELETE_PATH = 'M13 6.333c.417 0 .833.235.833.834';
const MINUS_PATH = 'M13.416 6.75a1.25 1.25 0 0 1 0 2.5';
const PLUS_PATH = 'M8 1.333c.69 0 1.25.56 1.25 1.25';

function productName(container: Element): string {
  const link = [...container.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]')]
    .find((candidate) => Boolean(accessibleName(candidate)));
  return link ? accessibleName(link) : '';
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
  for (const item of items) {
    const name = productName(item);
    if (!name) continue;
    const checkbox = item.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const quantity = item.querySelector<HTMLInputElement>('input[type="text"]');
    if (checkbox) setGeneratedAttribute(checkbox, 'aria-label', `Выбрать товар «${name}»`);
    if (quantity) setGeneratedAttribute(quantity, 'aria-label', `Количество товара «${name}»`);
    for (const button of item.querySelectorAll<HTMLButtonElement>('button')) {
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
