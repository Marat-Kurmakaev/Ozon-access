import { elementsIn, normalizeText, setGeneratedAttribute } from '../../core/accessibility';

export function improveAuth(root: ParentNode): void {
  for (const frame of elementsIn(root, 'iframe[src*="/ozonid-lite"]')) {
    setGeneratedAttribute(frame, 'title', 'Авторизация Ozon');
  }
  const document = root instanceof Document ? root : root.ownerDocument;
  if (!document) return;
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
