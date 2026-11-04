const WHITESPACE = /\s+/g;

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(WHITESPACE, ' ').trim();
}

export function referencedText(element: Element): string {
  const ids = normalizeText(element.getAttribute('aria-labelledby')).split(' ').filter(Boolean);
  return ids.map((id) => normalizeText(element.ownerDocument.getElementById(id)?.textContent)).filter(Boolean).join(' ');
}

export function accessibleName(element: Element): string {
  if (element.getAttribute('aria-hidden') === 'true') return '';
  const label = normalizeText(element.getAttribute('aria-label'));
  if (label) return label;
  const labelled = referencedText(element);
  if (labelled) return labelled;
  const text = normalizeText(element.textContent);
  if (text) return text;
  const imageAlt = normalizeText(element.querySelector('img[alt]')?.getAttribute('alt'));
  if (imageAlt) return imageAlt;
  const title = normalizeText(element.getAttribute('title'));
  if (title) return title;
  if (element instanceof HTMLInputElement) {
    const explicitLabel = element.id
      ? normalizeText(element.ownerDocument.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent)
      : '';
    return explicitLabel || normalizeText(element.getAttribute('placeholder'));
  }
  return '';
}

export function setGeneratedAttribute(element: Element, name: string, value: string): boolean {
  if (!value || element.hasAttribute(name)) return false;
  element.setAttribute(name, value);
  element.setAttribute(`data-ozon-access-${name}`, 'true');
  element.setAttribute('data-ozon-access', 'true');
  return true;
}

export function setGeneratedStateAttribute(element: Element, name: string, value: string): boolean {
  if (!value) return false;
  const marker = `data-ozon-access-${name}`;
  if (element.hasAttribute(name) && !element.hasAttribute(marker)) return false;
  if (element.getAttribute(name) === value) return false;
  element.setAttribute(name, value);
  element.setAttribute(marker, 'true');
  element.setAttribute('data-ozon-access', 'true');
  return true;
}

export function productPath(href: string): string | null {
  try {
    const url = new URL(href, 'https://www.ozon.ru');
    return url.pathname.startsWith('/product/') ? url.pathname.replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

export function elementsIn(root: ParentNode, selector: string): Element[] {
  const elements = [...root.querySelectorAll(selector)];
  if (root instanceof Element && root.matches(selector)) elements.unshift(root);
  return elements;
}
