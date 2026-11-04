import { accessibleName, elementsIn, productPath, setGeneratedAttribute, setGeneratedStateAttribute } from '../../core/accessibility';

const PREVIOUS_PHOTO_PATH = 'M8.293 3.293a1 1 0 1 1 1.414 1.414L6.414 8l3.293 3.293a1 1 0 1 1-1.414 1.414l-4-4a1 1 0 0 1 0-1.414z';
const NEXT_PHOTO_PATH = 'M6.293 3.293a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 1 1-1.414-1.414L9.586 8 6.293 4.707a1 1 0 0 1 0-1.414';
const OUTLINE_FAVORITE_PATH = 'M7 5a4 4 0 0 0-4 4c0 3.552 2.218 6.296 4.621 8.22A21.5 21.5 0 0 0 12 19.91a21.6 21.6 0 0 0 4.377-2.69C18.78 15.294 21 12.551 21 9a4 4 0 0 0-4-4c-1.957 0-3.652 1.396-4.02 3.2a1 1 0 0 1-1.96 0C10.652 6.396 8.957 5 7 5';
const FILLED_FAVORITE_PATH = 'M12 22c-.316-.02-.56-.147-.848-.278a23.5 23.5 0 0 1-4.781-2.942C3.777 16.705 1 13.449 1 9a6 6 0 0 1 6-6 6.18 6.18 0 0 1 5 2.568A6.18 6.18 0 0 1 17 3a6 6 0 0 1 6 6c0 4.448-2.78 7.705-5.375 9.78a23.6 23.6 0 0 1-4.78 2.942c-.543.249-.732.278-.845.278';

function productNameForArrow(button: HTMLButtonElement, grid: Element): string {
  const imageLink = button.closest<HTMLAnchorElement>('a[href*="/product/"]');
  const path = productPath(imageLink?.getAttribute('href') ?? '');
  if (!path) return '';
  for (const link of grid.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]')) {
    if (productPath(link.getAttribute('href') ?? '') !== path || link === imageLink) continue;
    const name = accessibleName(link);
    if (name) return name;
  }
  return accessibleName(imageLink!);
}

function improveProductPhotoButtons(root: ParentNode): void {
  const grids = root instanceof Element && root.closest('[data-widget="tileGridDesktop"]')
    ? [root.closest('[data-widget="tileGridDesktop"]') as Element]
    : elementsIn(root, '[data-widget="tileGridDesktop"]');
  for (const grid of grids) {
    for (const button of grid.querySelectorAll<HTMLButtonElement>('a[href*="/product/"] button')) {
      if (accessibleName(button)) continue;
      const path = button.querySelector('svg path')?.getAttribute('d') ?? '';
      const action = path === PREVIOUS_PHOTO_PATH ? 'Предыдущее фото' : path === NEXT_PHOTO_PATH ? 'Следующее фото' : '';
      if (!action) continue;
      const productName = productNameForArrow(button, grid);
      if (productName) setGeneratedAttribute(button, 'aria-label', `${action} товара «${productName}»`);
    }
  }
}

function nearbyProductName(button: HTMLButtonElement): string {
  let current: Element | null = button;
  for (let depth = 0; current && depth < 8; depth += 1, current = current.parentElement) {
    const links = [...current.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]')];
    const named = links.find((link) => Boolean(accessibleName(link)));
    if (named) return accessibleName(named);
  }
  return '';
}

function improveFavoriteButtons(root: ParentNode): void {
  const containers = root instanceof Element && root.closest('[data-widget="tileGridDesktop"], [data-widget="tileScrollDesktop"]')
    ? [root.closest('[data-widget="tileGridDesktop"], [data-widget="tileScrollDesktop"]') as Element]
    : elementsIn(root, '[data-widget="tileGridDesktop"], [data-widget="tileScrollDesktop"]');
  for (const container of containers) {
    for (const button of container.querySelectorAll<HTMLButtonElement>('button:has(svg)')) {
      const paths = [...button.querySelectorAll('svg path')].map((path) => path.getAttribute('d') ?? '');
      const inactive = paths.includes(OUTLINE_FAVORITE_PATH);
      const active = paths.length === 1 && paths[0] === FILLED_FAVORITE_PATH;
      if (!inactive && !active) continue;
      const productName = nearbyProductName(button);
      if (!productName) continue;
      setGeneratedStateAttribute(button, 'aria-label', active
        ? `Удалить товар «${productName}» из избранного`
        : `Добавить товар «${productName}» в избранное`);
      setGeneratedStateAttribute(button, 'aria-pressed', String(active));
    }
  }
}

export function improveButtons(root: ParentNode): void {
  improveProductPhotoButtons(root);
  improveFavoriteButtons(root);
  for (const profile of elementsIn(root, '[data-widget="profileMenuAnonymous"][tabindex]')) {
    setGeneratedAttribute(profile, 'role', 'button');
    setGeneratedAttribute(profile, 'aria-label', 'Войти');
  }
  const searchInputs = root.querySelectorAll<HTMLInputElement>('input[type="text"][name="text"][placeholder*="Ozon" i]');
  for (const input of searchInputs) {
    if (!accessibleName(input)) setGeneratedAttribute(input, 'aria-label', 'Поиск на Ozon');
    const searchRegion = input.parentElement?.parentElement;
    if (!searchRegion) continue;
    const submit = searchRegion.parentElement?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit && !accessibleName(submit)) setGeneratedAttribute(submit, 'aria-label', 'Поиск');
    for (const button of searchRegion.querySelectorAll<HTMLButtonElement>('button[type="button"]')) {
      if (!accessibleName(button) && button.querySelector('svg') && submit) {
        setGeneratedAttribute(button, 'aria-label', 'Поиск по изображению');
      }
    }
  }
}
