import { accessibleName, setGeneratedAttribute } from '../../core/accessibility';

export function improveButtons(root: ParentNode): void {
  for (const profile of root.querySelectorAll<HTMLElement>('[data-widget="profileMenuAnonymous"][tabindex]')) {
    if (accessibleName(profile)) setGeneratedAttribute(profile, 'role', 'button');
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
