import { elementsIn, normalizeText, setGeneratedAttribute, setGeneratedStateAttribute } from '../../core/accessibility';

function countryCodeFor(combo: HTMLInputElement): string {
  return normalizeText(combo.parentElement?.textContent).match(/\+\d{1,6}/)?.[0] ?? '';
}

function improveCountrySelector(document: Document): void {
  const combo = document.querySelector<HTMLInputElement>('input[role="combobox"][readonly][name="filter"]');
  if (!combo) return;
  const code = countryCodeFor(combo);
  setGeneratedStateAttribute(combo, 'aria-label', code
    ? `Выбор страны и телефонного кода, текущий код ${code}`
    : 'Выбор страны и телефонного кода');
  setGeneratedAttribute(combo, 'aria-haspopup', 'listbox');

  const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
  const listbox = options[0]?.parentElement;
  if (!listbox || !options.every((option) => option.parentElement === listbox)) return;
  setGeneratedAttribute(listbox, 'role', 'listbox');
  setGeneratedAttribute(listbox, 'aria-label', 'Страны и телефонные коды');
  setGeneratedAttribute(listbox, 'id', 'ozon-access-country-listbox');
  setGeneratedStateAttribute(combo, 'aria-controls', listbox.id);
  for (const option of options) {
    const selected = option.querySelectorAll('svg').length > 1;
    setGeneratedStateAttribute(option, 'aria-selected', String(selected));
  }
}

export function improveAuth(root: ParentNode): void {
  for (const frame of elementsIn(root, 'iframe[src*="/ozonid-lite"]')) {
    setGeneratedAttribute(frame, 'title', 'Авторизация Ozon');
  }
  const document = root instanceof Document ? root : root.ownerDocument;
  if (!document) return;
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
