# Сводка аудита OzonAccess

Режим: **compare**. Источник: `ozon-dom.html`. Время: 2026-11-04T09:50:12.268Z.

## Покрытие

| Показатель | Количество |
| --- | --- |
| Интерактивные или потенциально интерактивные элементы | 3913 |
| Группы повторяющихся компонентов | 96 |
| Достоверно классифицированные элементы | 426 |
| Сильные предположения | 420 |
| Кнопки без вычисляемого имени Chromium | 431 |
| Ссылки без вычисляемого имени Chromium | 76 |
| Уникальные типы проблем | 8 |

## Типы проблем

- Кнопки без доступного имени
- Ссылки без доступного имени
- axe: button-name
- axe: color-contrast
- axe: image-alt
- axe: link-name
- axe: page-has-heading-one
- axe: region

## Сравнение состояний

| Состояние | Элементы | Безымянные кнопки | Безымянные ссылки | Ориентиры main | Заголовки |
| --- | --- | --- | --- | --- | --- |
| before | 1955 | 216 | 73 | 0 | 0 |
| after | 1958 | 215 | 3 | 1 | 70 |


## Самые крупные повторяющиеся группы

| ID | Количество | Тег | Роль | Контекст | Назначение | Уверенность |
| --- | --- | --- | --- | --- | --- | --- |
| element-group-001 | 804 | span | generic | tileGridDesktop | Неизвестно | unknown |
| element-group-002 | 700 | div | generic | tileGridDesktop | Неизвестно | unknown |
| element-group-003 | 560 | path | — | tileGridDesktop | Неизвестно | unknown |
| element-group-004 | 420 | svg | image | tileGridDesktop | Неизвестно | unknown |
| element-group-005 | 140 | a | link | tileGridDesktop | Назначение определяется индивидуальным доступным именем | confirmed |
| element-group-006 | 140 | div | generic | tileGridDesktop | Неизвестно | unknown |
| element-group-007 | 140 | img | image | tileGridDesktop | Неизвестно | unknown |
| element-group-008 | 140 | button | button | tileGridDesktop | Предыдущая фотография товара | strong-inference |
| element-group-009 | 140 | button | button | tileGridDesktop | Следующая фотография товара | strong-inference |
| element-group-010 | 140 | a | link | tileGridDesktop | Назначение определяется индивидуальным доступным именем | confirmed |
| element-group-011 | 140 | button | button | tileGridDesktop | Добавление товара в избранное | strong-inference |
| element-group-012 | 70 | span | — | tileGridDesktop | Неизвестно | unknown |
| element-group-013 | 70 | span | heading | tileGridDesktop | Назначение определяется индивидуальным доступным именем | confirmed |
| element-group-014 | 30 | div | generic | footer | Неизвестно | unknown |
| element-group-015 | 20 | a | link | footer | Назначение определяется индивидуальным доступным именем | confirmed |
| element-group-016 | 18 | span | — | footer | Неизвестно | unknown |
| element-group-017 | 14 | div | generic | addressBookBarWeb | Неизвестно | unknown |
| element-group-018 | 10 | svg | image | horizontalMenu | Неизвестно | unknown |
| element-group-019 | 10 | path | — | horizontalMenu | Неизвестно | unknown |
| element-group-020 | 8 | div | generic | advBanner | Неизвестно | unknown |

## Ограничения

- Fixture не содержит работающего приложения и реальных обработчиков Ozon.
- Chromium не воспроизводит серверное состояние и NVDA.
- Неизвестные элементы не нажимались.

Отсутствие нарушений axe-core не доказывает полную доступность. Автоматический аудит не заменяет NVDA.
