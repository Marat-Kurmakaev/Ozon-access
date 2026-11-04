import { accessibleName, elementsIn } from './accessibility';

export type DiagnosticKind = 'unnamed-button' | 'unnamed-link' | 'heading-order' | 'unknown-interactive' | 'rule-error';
export interface DiagnosticIssue { kind: DiagnosticKind; message: string; element?: Element; }
export interface DiagnosticReport { generatedAt: string; issues: DiagnosticIssue[]; }

function interactiveWithoutNativeRole(root: ParentNode): Element[] {
  return elementsIn(root, '[onclick], [tabindex]').filter((element) => {
    if (element.matches('a[href], button, input, select, textarea')) return false;
    const tabindex = element.getAttribute('tabindex');
    return element.hasAttribute('onclick') || (tabindex !== null && Number(tabindex) >= 0);
  });
}

export function diagnose(document: Document, errors: DiagnosticIssue[] = []): DiagnosticReport {
  const issues = [...errors];
  for (const button of document.querySelectorAll('button')) {
    if (!accessibleName(button)) issues.push({ kind: 'unnamed-button', message: 'Кнопка без вычислимого статическим анализом имени', element: button });
  }
  for (const link of document.querySelectorAll('a[href]')) {
    if (!accessibleName(link)) issues.push({ kind: 'unnamed-link', message: 'Ссылка без вычислимого статическим анализом имени', element: link });
  }
  let previous = 0;
  for (const heading of document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"][aria-level]')) {
    const level = heading.matches('h1,h2,h3,h4,h5,h6') ? Number(heading.tagName[1]) : Number(heading.getAttribute('aria-level'));
    if (previous && level > previous + 1) issues.push({ kind: 'heading-order', message: `Переход уровня заголовка ${previous} → ${level}`, element: heading });
    previous = level;
  }
  for (const element of interactiveWithoutNativeRole(document)) {
    if (!element.getAttribute('role')) issues.push({ kind: 'unknown-interactive', message: 'Интерактивный элемент без подтверждённой нативной роли', element });
  }
  return { generatedAt: new Date().toISOString(), issues };
}

export function publishDiagnostics(report: DiagnosticReport): void {
  Object.defineProperty(window, '__ozonAccessReport', { value: report, configurable: true });
  const summary = report.issues.reduce<Record<string, number>>((result, issue) => {
    result[issue.kind] = (result[issue.kind] ?? 0) + 1;
    return result;
  }, {});
  console.info('[OzonAccess] Диагностика', summary, report);
}
