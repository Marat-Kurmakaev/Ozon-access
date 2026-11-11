import { elementsIn, hasAuthorAccessibleName, normalizeText, setGeneratedAttribute, setGeneratedStateAttribute } from '../../core/accessibility';

const enhancedCountryCombos = new WeakSet<HTMLInputElement>();
const pendingCountryFocusRestore = new WeakSet<HTMLInputElement>();
let countryOptionId = 0;

function removeGeneratedAttribute(element: Element, name: string): void {
  const marker = `data-ozon-access-${name}`;
  if (!element.hasAttribute(marker)) return;
  element.removeAttribute(name);
  element.removeAttribute(marker);
}

function optionClasses(options: HTMLElement[]): Map<string, Set<HTMLElement>> {
  const owners = new Map<string, Set<HTMLElement>>();
  for (const option of options) {
    for (const token of option.classList) {
      const elements = owners.get(token) ?? new Set<HTMLElement>();
      elements.add(option);
      owners.set(token, elements);
    }
  }
  return owners;
}

function transferredActiveOption(
  before: Map<string, Set<HTMLElement>>,
  options: HTMLElement[],
): HTMLElement | null {
  const after = optionClasses(options);
  for (const [token, previousOwners] of before) {
    const currentOwners = after.get(token);
    if (previousOwners.size !== 1 || currentOwners?.size !== 1) continue;
    const previous = previousOwners.values().next().value as HTMLElement;
    const current = currentOwners.values().next().value as HTMLElement;
    if (previous !== current) return current;
  }
  return null;
}

function clearCountryPopupRelations(combo: HTMLInputElement): void {
  removeGeneratedAttribute(combo, 'aria-activedescendant');
  removeGeneratedAttribute(combo, 'aria-controls');
}

function finishCountryPopupClose(combo: HTMLInputElement): void {
  const document = combo.ownerDocument;
  if (!combo.isConnected || document.querySelector('[role="option"]')) return;
  clearCountryPopupRelations(combo);
  if (document.activeElement === document.body) {
    document.querySelector<HTMLInputElement>('input[type="tel"]')?.focus({ preventScroll: true });
  }
  pendingCountryFocusRestore.delete(combo);
}

function improveCountryKeyboard(combo: HTMLInputElement): void {
  if (enhancedCountryCombos.has(combo)) return;
  enhancedCountryCombos.add(combo);
  combo.addEventListener('keydown', (event) => {
    const document = combo.ownerDocument;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const before = optionClasses([...document.querySelectorAll<HTMLElement>('[role="option"]')]);
      setTimeout(() => {
        const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
        const active = transferredActiveOption(before, options);
        if (!active) return;
        if (!active.id) setGeneratedAttribute(active, 'id', `ozon-access-country-option-${countryOptionId += 1}`);
        setGeneratedStateAttribute(combo, 'aria-activedescendant', active.id);
      }, 0);
      return;
    }
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    pendingCountryFocusRestore.add(combo);
    setTimeout(() => finishCountryPopupClose(combo), 0);
  }, { capture: true });
}

function countryCodeFor(combo: HTMLInputElement): string {
  return normalizeText(combo.parentElement?.textContent).match(/\+\d{1,6}/)?.[0] ?? '';
}

function nearbyCheckboxLabel(checkbox: HTMLInputElement): string {
  let current = checkbox.parentElement;
  for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
    const text = normalizeText(current.textContent);
    if (text) return text;
  }
  return '';
}

function improveConsentCheckboxes(document: Document): void {
  for (const checkbox of document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')) {
    if (hasAuthorAccessibleName(checkbox)) continue;
    const label = nearbyCheckboxLabel(checkbox);
    if (/^Соглашаюсь(?:\s|$)/i.test(label)) setGeneratedAttribute(checkbox, 'aria-label', label);
  }
}

function improveCountrySelector(document: Document): void {
  const combo = document.querySelector<HTMLInputElement>('input[role="combobox"][readonly][name="filter"]');
  if (!combo) return;
  improveCountryKeyboard(combo);
  const code = countryCodeFor(combo);
  setGeneratedStateAttribute(combo, 'aria-label', code
    ? `Выбор страны и телефонного кода, текущий код ${code}`
    : 'Выбор страны и телефонного кода');
  setGeneratedAttribute(combo, 'aria-haspopup', 'listbox');

  const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  const listbox = options[0]?.parentElement;
  if (!listbox || !options.every((option) => option.parentElement === listbox)) {
    clearCountryPopupRelations(combo);
    if (pendingCountryFocusRestore.has(combo)) finishCountryPopupClose(combo);
    return;
  }
  setGeneratedAttribute(listbox, 'role', 'listbox');
  setGeneratedAttribute(listbox, 'aria-label', 'Страны и телефонные коды');
  setGeneratedAttribute(listbox, 'id', 'ozon-access-country-listbox');
  setGeneratedStateAttribute(combo, 'aria-controls', listbox.id);
}

export function improveAuth(root: ParentNode): void {
  for (const frame of elementsIn(root, 'iframe[src*="/ozonid-lite"]')) {
    setGeneratedAttribute(frame, 'title', 'Авторизация Ozon');
    const modalLayout = frame.closest('[data-widget="modalLayout"]');
    const close = modalLayout?.parentElement?.querySelector<HTMLButtonElement>(':scope > button');
    if (close && !hasAuthorAccessibleName(close)) setGeneratedAttribute(close, 'aria-label', 'Закрыть окно авторизации');
  }
  const document = root instanceof Document ? root : root.ownerDocument;
  if (!document) return;
  improveConsentCheckboxes(document);
  improveCountrySelector(document);
  const phone = document.querySelector<HTMLInputElement>('input[type="tel"]');
  if (phone && /Введите номер телефона/i.test(document.body?.textContent ?? '')) {
    setGeneratedAttribute(phone, 'aria-label', 'Номер телефона');
  }
  const errors = elementsIn(root, 'p, [class*="error" i]')
    .filter((element) => /^(некорректный формат телефона|введите номер телефона)$/i.test(normalizeText(element.textContent)));
  const error = errors.find((element) => element.children.length === 0) ?? errors[0];
  if (error) {
    const message = normalizeText(error.textContent);
    if (/некорректный формат телефона|введите номер телефона/i.test(message)) {
      setGeneratedAttribute(error, 'role', 'alert');
      setGeneratedAttribute(error, 'id', 'ozon-access-phone-error');
      if (phone) setGeneratedAttribute(phone, 'aria-describedby', error.id);
    }
  }
}
