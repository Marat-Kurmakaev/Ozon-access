# Ручное тестирование с NVDA

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

| ID | Количество | Контекст | Предположение | Уверенность |
| --- | --- | --- | --- | --- |
| element-group-001 | 402 | tileGridDesktop | Неизвестно | unknown |
| element-group-002 | 350 | tileGridDesktop | Неизвестно | unknown |
| element-group-003 | 280 | tileGridDesktop | Неизвестно | unknown |
| element-group-004 | 210 | tileGridDesktop | Неизвестно | unknown |
| element-group-006 | 70 | tileGridDesktop | Неизвестно | unknown |
| element-group-007 | 70 | tileGridDesktop | Неизвестно | unknown |
| element-group-008 | 70 | tileGridDesktop | Предыдущая фотография товара | strong-inference |
| element-group-009 | 70 | tileGridDesktop | Следующая фотография товара | strong-inference |
| element-group-011 | 70 | tileGridDesktop | Неизвестно | unknown |
| element-group-012 | 70 | tileGridDesktop | Добавление товара в избранное | strong-inference |
| element-group-013 | 15 | footer | Неизвестно | unknown |
| element-group-015 | 9 | footer | Неизвестно | unknown |
| element-group-016 | 7 | addressBookBarWeb | Неизвестно | unknown |
| element-group-017 | 5 | horizontalMenu | Неизвестно | unknown |
| element-group-018 | 5 | horizontalMenu | Неизвестно | unknown |
| element-group-019 | 4 | advBanner | Неизвестно | unknown |
| element-group-020 | 4 | footer | Неизвестно | unknown |
| element-group-021 | 4 | footer | Неизвестно | unknown |
| element-group-022 | 3 | searchBarDesktop | Неизвестно | unknown |
| element-group-023 | 3 | selectedCurrencyLanguage | Неизвестно | unknown |
| element-group-024 | 3 | cookieBubble | Неизвестно | unknown |
| element-group-025 | 2 | catalogMenu | Неизвестно | unknown |
| element-group-026 | 2 | searchBarDesktop | Неизвестно | unknown |
| element-group-027 | 2 | searchBarDesktop | Неизвестно | unknown |
| element-group-028 | 2 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-029 | 2 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-033 | 2 | advBanner | Неизвестно | unknown |
| element-group-034 | 2 | advBanner | Неизвестно | unknown |
| element-group-035 | 2 | advBanner | Неизвестно | unknown |
| element-group-036 | 2 | advBanner | Неизвестно | unknown |
| element-group-037 | 2 | advBanner | Неизвестно | unknown |
| element-group-043 | 1 | catalogMenu | Неизвестно | unknown |
| element-group-044 | 1 | catalogMenu | Неизвестно | unknown |
| element-group-045 | 1 | catalogMenu | Неизвестно | unknown |
| element-group-049 | 1 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-050 | 1 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-051 | 1 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-052 | 1 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-053 | 1 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-055 | 1 | orderInfo | Неизвестно | unknown |
| element-group-056 | 1 | orderInfo | Неизвестно | unknown |
| element-group-057 | 1 | orderInfo | Неизвестно | unknown |
| element-group-058 | 1 | orderInfo | Неизвестно | unknown |
| element-group-059 | 1 | orderInfo | Неизвестно | unknown |
| element-group-061 | 1 | favoriteCounter | Неизвестно | unknown |
| element-group-062 | 1 | favoriteCounter | Неизвестно | unknown |
| element-group-063 | 1 | favoriteCounter | Неизвестно | unknown |
| element-group-064 | 1 | favoriteCounter | Неизвестно | unknown |
| element-group-065 | 1 | favoriteCounter | Неизвестно | unknown |
| element-group-067 | 1 | headerIcon | Неизвестно | unknown |
| element-group-068 | 1 | headerIcon | Неизвестно | unknown |
| element-group-069 | 1 | headerIcon | Неизвестно | unknown |
| element-group-070 | 1 | headerIcon | Неизвестно | unknown |
| element-group-071 | 1 | headerIcon | Неизвестно | unknown |
| element-group-077 | 1 | addressBookBarWeb | Неизвестно | unknown |
| element-group-079 | 1 | selectedCurrencyLanguage | Неизвестно | unknown |
| element-group-080 | 1 | selectedCurrencyLanguage | Неизвестно | unknown |
| element-group-081 | 1 | seasonWidget | Неизвестно | unknown |
| element-group-082 | 1 | seasonWidget | Неизвестно | unknown |
| element-group-085 | 1 | footer | Неизвестно | unknown |
| element-group-086 | 1 | footer | Неизвестно | unknown |
| element-group-087 | 1 | footer | Неизвестно | unknown |
| element-group-088 | 1 | footer | Неизвестно | unknown |
| element-group-090 | 1 | footer | Неизвестно | unknown |
