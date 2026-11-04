import { elementsIn, normalizeText, setGeneratedAttribute } from '../../core/accessibility';

function adjacentLabel(input: HTMLInputElement): string {
  if (input.type === 'text') {
    const edge = normalizeText(input.nextElementSibling?.textContent || input.parentElement?.textContent);
    if (/^(от|до)$/i.test(edge)) return `Цена ${edge.toLowerCase()}`;
  }
  const wrapper = input.parentElement?.parentElement;
  return normalizeText(wrapper?.nextElementSibling?.textContent || wrapper?.previousElementSibling?.textContent);
}

export function improveFilters(root: ParentNode): void {
  const containers = root instanceof Element && root.closest('[data-widget="filtersDesktop"]')
    ? [root.closest('[data-widget="filtersDesktop"]') as Element]
    : elementsIn(root, '[data-widget="filtersDesktop"]');
  for (const container of containers) {
    for (const input of container.querySelectorAll<HTMLInputElement>('input')) {
      setGeneratedAttribute(input, 'aria-label', adjacentLabel(input));
    }
    for (const sort of container.ownerDocument.querySelectorAll<HTMLInputElement>('input[readonly][value]')) {
      if (/популяр|новин|дешев|дороже|рейтинг|скид/i.test(sort.value)) {
        setGeneratedAttribute(sort, 'aria-label', 'Сортировка товаров');
      }
    }
  }
}
