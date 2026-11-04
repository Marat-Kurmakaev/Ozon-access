# Сводка аудита OzonAccess

Режим: **fixture**. Источник: `ozon-dom.html`. Время: 2026-11-04T13:50:12.562Z.

## Покрытие

| Показатель | Количество |
| --- | --- |
| Интерактивные или потенциально интерактивные элементы | 1955 |
| Группы повторяющихся компонентов | 91 |
| Достоверно классифицированные элементы | 388 |
| Сильные предположения | 0 |
| Кнопки без вычисляемого имени Chromium | 216 |
| Ссылки без вычисляемого имени Chromium | 73 |
| Уникальные типы проблем | 11 |

## Типы проблем

- Кнопки без доступного имени
- Ссылки без доступного имени
- Нет ориентира main среди исследованных элементов
- Нет заголовков
- axe: button-name
- axe: color-contrast
- axe: image-alt
- axe: landmark-one-main
- axe: link-name
- axe: page-has-heading-one
- axe: region


## Самые крупные повторяющиеся группы

| ID | Количество | Тег | Роль | Контекст | Назначение | Уверенность |
| --- | --- | --- | --- | --- | --- | --- |
| element-group-001 | 402 | span | generic | tileGridDesktop | Неизвестно | unknown |
| element-group-002 | 350 | div | generic | tileGridDesktop | Неизвестно | unknown |
| element-group-003 | 280 | path | — | tileGridDesktop | Неизвестно | unknown |
| element-group-004 | 210 | svg | image | tileGridDesktop | Неизвестно | unknown |
| element-group-005 | 70 | a | link | tileGridDesktop | Ссылка на товар без доступного имени | confirmed |
| element-group-006 | 70 | div | generic | tileGridDesktop | Неизвестно | unknown |
| element-group-007 | 70 | img | image | tileGridDesktop | Неизвестно | unknown |
| element-group-008 | 70 | button | button | tileGridDesktop | Предыдущая фотография товара | confirmed |
| element-group-009 | 70 | button | button | tileGridDesktop | Следующая фотография товара | confirmed |
| element-group-010 | 70 | a | link | tileGridDesktop | Назначение определяется индивидуальным доступным именем | confirmed |
| element-group-011 | 70 | span | — | tileGridDesktop | Неизвестно | unknown |
| element-group-012 | 70 | button | button | tileGridDesktop | Добавление товара в избранное | confirmed |
| element-group-013 | 15 | div | generic | footer | Неизвестно | unknown |
| element-group-014 | 10 | a | link | footer | Назначение определяется индивидуальным доступным именем | confirmed |
| element-group-015 | 9 | span | — | footer | Неизвестно | unknown |
| element-group-016 | 7 | div | generic | addressBookBarWeb | Неизвестно | unknown |
| element-group-017 | 5 | svg | image | horizontalMenu | Неизвестно | unknown |
| element-group-018 | 5 | path | — | horizontalMenu | Неизвестно | unknown |
| element-group-019 | 4 | div | generic | advBanner | Неизвестно | unknown |
| element-group-020 | 4 | svg | image | footer | Неизвестно | unknown |

## Ограничения

- Fixture не содержит работающего приложения и реальных обработчиков Ozon.
- Chromium не воспроизводит серверное состояние и NVDA.
- Неизвестные элементы не нажимались.

Отсутствие нарушений axe-core не доказывает полную доступность. Автоматический аудит не заменяет NVDA.
