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
  if (!document.querySelector('main, [role="main"]')) {
    const productGrid = document.querySelector('[data-widget="tileGridDesktop"]');
    const productFeed = document.querySelector<HTMLElement>('[data-widget="infiniteVirtualPaginator"]')
      ?? document.querySelector<HTMLElement>('[data-widget="paginator"]');
    const pageAnchor = document.querySelector<HTMLElement>('[data-widget="webProductMainWidget"], [data-widget="cartSplit"], [data-widget="myGuest"], [data-widget="statusWidget"], [data-widget="filtersDesktop"]');
    const pageWallpaper = pageAnchor?.closest<HTMLElement>('[data-widget="wallpaper"]');
    const safePageWallpaper = pageWallpaper && !pageWallpaper.querySelector('header, footer') ? pageWallpaper : null;
    const safeWallpaper = [...document.querySelectorAll<HTMLElement>('[data-widget="wallpaper"]')]
      .find((element) => !element.querySelector('header, footer') && Boolean(element.querySelector('[data-widget="tileGridDesktop"], a[href*="/product/"]')));
    const content = safePageWallpaper ?? (productFeed?.querySelector('a[href*="/product/"]') ? productFeed : null) ?? safeWallpaper ?? productGrid?.parentElement;
    if (content) {
      setGeneratedAttribute(content, 'role', 'main');
      setGeneratedAttribute(content, 'aria-label', 'Основное содержимое Ozon');
    }
  }
  for (const status of document.querySelectorAll<HTMLElement>('[data-widget="statusWidget"] span')) {
    if (/^Ничего не нашлось$/i.test(status.textContent?.trim() ?? '')) {
      setGeneratedAttribute(status, 'role', 'heading');
      setGeneratedAttribute(status, 'aria-level', '1');
    }
  }
  for (const guest of document.querySelectorAll<HTMLElement>('[data-widget="myGuest"] div')) {
    if (/^Вы не авторизованы$/i.test(guest.textContent?.trim() ?? '') && guest.children.length === 0) {
      setGeneratedAttribute(guest, 'role', 'heading');
      setGeneratedAttribute(guest, 'aria-level', '1');
    }
  }
}
