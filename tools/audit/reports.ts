import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AuditResult, ComponentGroup } from './types';

const eol = '\n';
const table = (headers: string[], rows: string[][]) => [
  `| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ')} |`),
].join(eol);

function issueTypes(result: AuditResult): string[] {
  const types = new Set<string>();
  if (result.elements.some((item) => item.tag === 'button' && !item.computedName)) types.add('Кнопки без доступного имени');
  if (result.elements.some((item) => item.tag === 'a' && !item.computedName)) types.add('Ссылки без доступного имени');
  if (result.elements.some((item) => item.focusable && !item.computedRole)) types.add('Фокусируемые элементы без вычисленной роли');
  if (result.elements.some((item) => item.axIgnored && item.focusable)) types.add('Фокусируемые элементы вне дерева доступности');
  if (!result.elements.some((item) => item.computedRole === 'main')) types.add('Нет ориентира main среди исследованных элементов');
  if (!result.elements.some((item) => /^heading$/.test(item.computedRole))) types.add('Нет заголовков');
  const violations = (result.axe.violations as Array<{ id: string }> | undefined) ?? [];
  for (const violation of violations) types.add(`axe: ${violation.id}`);
  return [...types];
}

function groupRows(groups: ComponentGroup[]): string[][] {
  return groups.map((group) => [group.id, String(group.count), group.tag, group.role || '—', group.context || '—', group.purpose, group.confidence]);
}

function unnamedGroups(result: AuditResult, tag: 'button' | 'a'): ComponentGroup[] {
  const ids = new Set(result.elements.filter((item) => item.tag === tag && !item.computedName).map((item) => item.componentGroup));
  return result.groups.filter((group) => ids.has(group.id));
}

function summary(result: AuditResult): string {
  const unnamedButtons = result.elements.filter((item) => item.tag === 'button' && !item.computedName).length;
  const unnamedLinks = result.elements.filter((item) => item.tag === 'a' && !item.computedName).length;
  const confirmed = result.elements.filter((item) => item.confidence === 'confirmed').length;
  const inferred = result.elements.filter((item) => item.confidence === 'strong-inference').length;
  const issues = issueTypes(result);
  const states = [...new Set(result.elements.map((item) => item.state))];
  const stateSection = states.length > 1 ? `
## Сравнение состояний

${table(['Состояние', 'Элементы', 'Безымянные кнопки', 'Безымянные ссылки', 'Ориентиры main', 'Заголовки'], states.map((state) => {
    const items = result.elements.filter((item) => item.state === state);
    return [state, String(items.length), String(items.filter((item) => item.tag === 'button' && !item.computedName).length),
      String(items.filter((item) => item.tag === 'a' && !item.computedName).length), String(items.filter((item) => item.computedRole === 'main').length),
      String(items.filter((item) => item.computedRole === 'heading').length)];
  }))}
` : '';
  return `# Сводка аудита OzonAccess

Режим: **${result.mode}**. Источник: \`${result.source}\`. Время: ${result.generatedAt}.

## Покрытие

${table(['Показатель', 'Количество'], [
    ['Интерактивные или потенциально интерактивные элементы', String(result.elements.length)],
    ['Группы повторяющихся компонентов', String(result.groups.length)],
    ['Достоверно классифицированные элементы', String(confirmed)],
    ['Сильные предположения', String(inferred)],
    ['Кнопки без вычисляемого имени Chromium', String(unnamedButtons)],
    ['Ссылки без вычисляемого имени Chromium', String(unnamedLinks)],
    ['Уникальные типы проблем', String(issues.length)],
  ])}

## Типы проблем

${issues.length ? issues.map((issue) => `- ${issue}`).join(eol) : '- Автоматически проверяемые проблемы не найдены.'}
${stateSection}

## Самые крупные повторяющиеся группы

${table(['ID', 'Количество', 'Тег', 'Роль', 'Контекст', 'Назначение', 'Уверенность'], groupRows(result.groups.slice(0, 20)))}

## Ограничения

${result.limitations.map((item) => `- ${item}`).join(eol)}

Отсутствие нарушений axe-core не доказывает полную доступность. Автоматический аудит не заменяет NVDA.
`;
}

function unnamedReport(title: string, groups: ComponentGroup[]): string {
  const sections = groups.map((group) => `## ${group.id}

- Тип: ${group.tag}
- Количество экземпляров: ${group.count}
- Доступное имя: отсутствует
- Контекст: ${group.context || 'не установлен'}
- SVG-сигнатура: ${group.svg || 'нет'}
- Предполагаемое действие: ${group.purpose}
- Основание: ${group.evidence}
- Поведение: не проверено автоматически
- Уверенность: ${group.confidence}
- Категория безопасности: ${group.safety}
- Элементы: ${group.elementIds.slice(0, 30).join(', ')}${group.elementIds.length > 30 ? '…' : ''}
`).join(eol);
  return `# ${title}

Группировка использует структуру, родительский виджет, вычисленную роль, SVG-сигнатуру, тип ссылки и состояния. CSS-класс не является единственным критерием.

${sections || 'Не обнаружены.'}
`;
}

function keyboard(result: AuditResult): string {
  return `# Проверка клавиатурной навигации

- Найдено переходов Tab: ${result.keyboard.tabStops.length}.
- Возможная ловушка фокуса: ${result.keyboard.possibleTrap ? 'да' : 'нет'}.
- Повторяющийся фокус: ${result.keyboard.repeatedFocus.join(', ') || 'не обнаружен'}.

## Последовательность Tab

${table(['№', 'ID', 'Тег', 'Роль', 'Имя'], result.keyboard.tabStops.map((item) => [String(item.order), item.id, item.tag, item.role || '—', item.name || 'без имени']))}

## Shift+Tab

${result.keyboard.reverseStops.map((id, index) => `${index + 1}. ${id || 'фокус вне каталога'}`).join(eol) || 'Не проверено.'}

## Примечания

${result.keyboard.notes.map((note) => `- ${note}`).join(eol)}
`;
}

function behavior(result: AuditResult): string {
  return `# Исследование поведения

- Режим: ${result.behavior.mode}.
- Безопасные взаимодействия явно разрешены: ${result.behavior.interactionsAllowed ? 'да' : 'нет'}.
- Неизвестные элементы автоматически не нажимались.

## Состояния

${table(['Состояние', 'URL', 'Элементы', 'AX-узлы', 'Примечания'], result.behavior.states.map((state) => [state.name, state.url, String(state.elementCount), String(state.axNodeCount), state.notes.join('; ') || '—']))}

## Взаимодействия

${result.behavior.interactions.length ? result.behavior.interactions.map((item) => `- ${JSON.stringify(item)}`).join(eol) : '- Взаимодействия не выполнялись.'}

## Сетевые метаданные

Сохранены только метод, тип ресурса и origin, без заголовков, cookie, параметров и тел. Уникальных записей: ${result.behavior.network.length}.

## Ошибки

${result.behavior.errors.map((error) => `- ${error}`).join(eol) || '- Ошибок не зафиксировано.'}
`;
}

function recommendations(result: AuditResult): string {
  const confirmedUnnamedProducts = result.elements.filter((item) => item.tag === 'a' && !item.computedName && item.href.includes('/product/')).length;
  return `# Рекомендации

1. Сохранить правило сопоставления двух товарных ссылок по нормализованному пути: подтверждено ${confirmedUnnamedProducts} безымянных товарных ссылок в исследованных состояниях.
2. Не назначать подписи повторяющимся SVG-кнопкам до подтверждения поведения и состояния. Они сгруппированы в \`unnamed-buttons.md\`.
3. Проверить с NVDA заголовки товаров, ориентиры, порядок Tab и объявления динамической подгрузки.
4. Для кнопок избранного после ручного подтверждения добавить имя с названием товара и проверить корректность \`aria-pressed\`; не выводить состояние из одной иконки.
5. Повторять fixture-аудит после изменения DOM-правил и сравнивать axe до/после.
`;
}

function manualTesting(result: AuditResult): string {
  const unknown = result.groups.filter((group) => group.confidence !== 'confirmed');
  return `# Ручное тестирование с NVDA

## Обязательные сценарии

1. Навигация D по ориентирам, H и 2 по заголовкам.
2. Tab и Shift+Tab через шапку, поиск, товарные карточки и подвал.
3. Объявление текстовой и графической ссылок одного товара.
4. Поиск по изображению: имя, открываемый интерфейс, Escape и возврат фокуса.
5. Меню входа: Enter, Space, Escape и управление фокусом без выполнения входа.
6. Карусели: назначение стрелок, недоступное состояние на границе и изменение содержимого.
7. Предполагаемые кнопки избранного: имя с товаром, состояние и отсутствие изменения без подтверждения пользователя.
8. Динамическая подгрузка после прокрутки: отсутствие потери позиции и лишних объявлений.

## Группы, требующие подтверждения

${table(['ID', 'Количество', 'Контекст', 'Предположение', 'Уверенность'], unknown.map((group) => [group.id, String(group.count), group.context || '—', group.purpose, group.confidence]))}
`;
}

export async function writeReports(result: AuditResult, outputDirectory: string): Promise<void> {
  const directory = resolve(outputDirectory);
  await mkdir(directory, { recursive: true });
  const buttons = unnamedGroups(result, 'button');
  const links = unnamedGroups(result, 'a');
  const files: Record<string, string> = {
    'summary.md': summary(result),
    'elements.json': JSON.stringify({ generatedAt: result.generatedAt, mode: result.mode, elements: result.elements, groups: result.groups }, null, 2),
    'unnamed-buttons.md': unnamedReport('Группы неподписанных кнопок', buttons),
    'unnamed-links.md': unnamedReport('Группы неподписанных ссылок', links),
    'keyboard.md': keyboard(result),
    'behavior.md': behavior(result),
    'accessibility-tree.yml': result.accessibilityTree,
    'axe-results.json': JSON.stringify(result.axe, null, 2),
    'recommendations.md': recommendations(result),
    'manual-testing.md': manualTesting(result),
  };
  await Promise.all(Object.entries(files).map(([name, contents]) => writeFile(resolve(directory, name), contents, 'utf8')));
}

export function reportMetrics(result: AuditResult): { issueTypes: number; confirmed: number; unknownGroups: number } {
  return { issueTypes: issueTypes(result).length, confirmed: result.elements.filter((item) => item.confidence === 'confirmed').length, unknownGroups: result.groups.filter((group) => group.confidence !== 'confirmed').length };
}
