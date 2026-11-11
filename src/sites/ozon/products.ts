import { elementsIn, hasAuthorAccessibleName, heuristicTextAlternative, normalizeText, productPath, setGeneratedAttribute } from '../../core/accessibility';

function headingCandidate(link: HTMLAnchorElement, name: string): HTMLElement | null {
  const descendants = [...link.querySelectorAll<HTMLElement>('span, div, p')];
  return descendants.reverse().find((element) =>
    normalizeText(element.textContent) === name &&
    ![...element.children].some((child) => normalizeText(child.textContent) === name),
  ) ?? null;
}

export function improveProducts(root: ParentNode): void {
  const grids = root instanceof Element && root.closest('[data-widget="tileGridDesktop"]')
    ? [root.closest('[data-widget="tileGridDesktop"]') as Element]
    : elementsIn(root, '[data-widget="tileGridDesktop"]');

  for (const grid of grids) {
    const groups = new Map<string, HTMLAnchorElement[]>();
    for (const link of grid.querySelectorAll<HTMLAnchorElement>('a[href*="/product/"]')) {
      const path = productPath(link.getAttribute('href') ?? '');
      if (!path) continue;
      const group = groups.get(path) ?? [];
      group.push(link);
      groups.set(path, group);
    }
    for (const links of groups.values()) {
      const namedLink = links.find((link) => Boolean(heuristicTextAlternative(link)));
      const name = namedLink ? heuristicTextAlternative(namedLink) : '';
      if (!name) continue;
      for (const link of links) {
        if (!hasAuthorAccessibleName(link)) setGeneratedAttribute(link, 'aria-label', name);
      }
      if (namedLink && !namedLink.querySelector('[role="heading"]')) {
        const candidate = headingCandidate(namedLink, name);
        if (candidate) {
          setGeneratedAttribute(candidate, 'role', 'heading');
          setGeneratedAttribute(candidate, 'aria-level', '2');
        }
      }
    }
  }
}
