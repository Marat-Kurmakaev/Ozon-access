import { elementsIn, hasAuthorAccessibleName, normalizeText, setGeneratedAttribute } from '../../core/accessibility';

export function improveLinks(root: ParentNode): void {
  for (const link of elementsIn(root, 'a[href]')) {
    if (hasAuthorAccessibleName(link)) continue;
    const image = link.querySelector('img[alt]');
    const alt = normalizeText(image?.getAttribute('alt'));
    if (alt) setGeneratedAttribute(link, 'aria-label', alt);
  }
}
