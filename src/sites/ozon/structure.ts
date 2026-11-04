import { setGeneratedAttribute } from '../../core/accessibility';

export function improveStructure(document: Document): void {
  const navigation = document.querySelector('[data-widget="horizontalMenu"]');
  if (navigation) {
    setGeneratedAttribute(navigation, 'role', 'navigation');
    setGeneratedAttribute(navigation, 'aria-label', 'Разделы Ozon');
  }
  const search = document.querySelector('[data-widget="searchBarDesktop"]');
  if (search) {
    setGeneratedAttribute(search, 'role', 'search');
    setGeneratedAttribute(search, 'aria-label', 'Поиск по Ozon');
  }
  if (document.querySelector('main, [role="main"]')) return;
  const content = [...document.querySelectorAll<HTMLElement>('[data-widget="wallpaper"]')]
    .find((element) => !element.querySelector('header') && Boolean(element.querySelector('[data-widget="tileGridDesktop"], a[href*="/product/"]')));
  if (content) {
    setGeneratedAttribute(content, 'role', 'main');
    setGeneratedAttribute(content, 'aria-label', 'Основное содержимое Ozon');
  }
}
