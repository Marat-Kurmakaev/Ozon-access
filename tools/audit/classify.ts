import { createHash } from 'node:crypto';
import type { ComponentGroup, ElementRecord } from './types';

export function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function hrefKind(href: string): string {
  if (!href) return '';
  if (href.includes('/product/')) return 'product';
  if (href.includes('/category/')) return 'category';
  return 'other-link';
}

export function fingerprint(record: Pick<ElementRecord, 'tag' | 'computedRole' | 'parentContext' | 'svg' | 'interactiveSource' | 'href' | 'axStates'>): string {
  const stateKeys = Object.keys(record.axStates).sort().join(',');
  return [record.tag, record.computedRole, record.parentContext.widget || record.parentContext.tag,
    record.svg.signature, record.interactiveSource.slice().sort().join(','), hrefKind(record.href), stateKeys].join('|');
}

export function classify(record: ElementRecord): void {
  if (record.computedName) {
    record.purpose = record.computedName;
    record.evidence = 'Вычисляемое имя получено из дерева доступности Chromium.';
    record.confidence = 'confirmed';
    record.safety = record.href ? 'confirmed-safe' : 'passive';
    return;
  }
  if (['main', 'navigation', 'banner', 'contentinfo', 'search', 'heading'].includes(record.computedRole)) {
    record.purpose = `Семантический узел: ${record.computedRole}`;
    record.evidence = 'Роль подтверждена деревом доступности Chromium; имя для этой роли не всегда обязательно.';
    record.confidence = 'confirmed';
    record.safety = 'passive';
    return;
  }
  if (record.tag === 'button' && record.parentContext.widget === 'searchBarDesktop' && record.svg.pathCount > 0) {
    record.purpose = 'Поиск по изображению';
    record.evidence = 'Кнопка type=button находится внутри виджета поиска рядом с полем поиска и подписанной submit-кнопкой; SVG имеет контур камеры.';
    record.confidence = 'confirmed';
    record.safety = 'manual-review';
    return;
  }
  if (record.tag === 'button' && record.parentContext.widget === 'tileGridDesktop' && record.svg.pathCount > 0) {
    const confirmedArrows: Record<string, string> = {
      c5aa4ed8f578: 'Предыдущая фотография товара',
      afb33512a013: 'Следующая фотография товара',
    };
    const confirmedStateful: Record<string, string> = {
      cda97bf95b0b: 'Добавление товара в избранное',
    };
    record.purpose = confirmedArrows[record.svg.signature] ?? confirmedStateful[record.svg.signature] ?? 'Возможное действие над товаром';
    record.evidence = confirmedArrows[record.svg.signature]
      ? 'Направление SVG и положение внутри ссылки изображения товара подтверждены на живой странице Ozon; переключение фотографии требует отдельного разрешённого теста.'
      : confirmedStateful[record.svg.signature]
        ? 'Добавление в избранное, смена SVG-состояния и счётчик подтверждены взаимодействием на живой странице; действие изменяет пользовательское состояние.'
      : 'Повторяющаяся SVG-кнопка находится в товарной сетке; одна иконка не доказывает действие.';
    record.confidence = confirmedArrows[record.svg.signature] || confirmedStateful[record.svg.signature] ? 'confirmed' : 'strong-inference';
    record.safety = confirmedArrows[record.svg.signature] ? 'manual-review' : 'forbidden';
    return;
  }
  if (record.tag === 'a' && record.href.includes('/product/')) {
    record.purpose = 'Ссылка на товар без доступного имени';
    record.evidence = 'Путь href подтверждает товар; название следует брать только из парной текстовой ссылки той же карточки.';
    record.confidence = 'confirmed';
    record.safety = 'confirmed-safe';
    return;
  }
  record.purpose = 'Неизвестно';
  record.evidence = 'Доступного имени и достаточных независимых признаков назначения не найдено.';
  record.confidence = 'unknown';
  record.safety = 'manual-review';
}

export function buildGroups(elements: ElementRecord[]): ComponentGroup[] {
  const grouped = new Map<string, ElementRecord[]>();
  for (const element of elements) {
    element.groupFingerprint = fingerprint(element);
    const bucket = grouped.get(element.groupFingerprint) ?? [];
    bucket.push(element);
    grouped.set(element.groupFingerprint, bucket);
  }
  return [...grouped.entries()].sort((a, b) => b[1].length - a[1].length).map(([key, members], index) => {
    const id = `element-group-${String(index + 1).padStart(3, '0')}`;
    for (const member of members) member.componentGroup = id;
    const first = members[0];
    const names = new Set(members.map((item) => item.computedName).filter(Boolean));
    const purposes = new Set(members.map((item) => item.purpose));
    return {
      id, fingerprint: shortHash(key), count: members.length, tag: first.tag,
      role: first.computedRole, accessibleName: names.size > 1 ? `[различается: ${names.size} значений]` : first.computedName,
      context: first.parentContext.widget || first.parentContext.tag,
      svg: first.svg.signature, purpose: purposes.size > 1 ? 'Назначение определяется индивидуальным доступным именем' : first.purpose,
      evidence: names.size > 1 ? 'Структурно одинаковые экземпляры имеют разные вычисляемые имена Chromium.' : first.evidence,
      confidence: first.confidence, safety: first.safety, elementIds: members.map((item) => item.id),
    };
  });
}
