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
| element-group-001 | 804 | tileGridDesktop | Неизвестно | unknown |
| element-group-002 | 700 | tileGridDesktop | Неизвестно | unknown |
| element-group-003 | 560 | tileGridDesktop | Неизвестно | unknown |
| element-group-004 | 420 | tileGridDesktop | Неизвестно | unknown |
| element-group-006 | 140 | tileGridDesktop | Неизвестно | unknown |
| element-group-007 | 140 | tileGridDesktop | Неизвестно | unknown |
| element-group-008 | 140 | tileGridDesktop | Предыдущая фотография товара | strong-inference |
| element-group-009 | 140 | tileGridDesktop | Следующая фотография товара | strong-inference |
| element-group-011 | 140 | tileGridDesktop | Добавление товара в избранное | strong-inference |
| element-group-012 | 70 | tileGridDesktop | Неизвестно | unknown |
| element-group-014 | 30 | footer | Неизвестно | unknown |
| element-group-016 | 18 | footer | Неизвестно | unknown |
| element-group-017 | 14 | addressBookBarWeb | Неизвестно | unknown |
| element-group-018 | 10 | horizontalMenu | Неизвестно | unknown |
| element-group-019 | 10 | horizontalMenu | Неизвестно | unknown |
| element-group-020 | 8 | advBanner | Неизвестно | unknown |
| element-group-021 | 8 | footer | Неизвестно | unknown |
| element-group-022 | 8 | footer | Неизвестно | unknown |
| element-group-023 | 6 | searchBarDesktop | Неизвестно | unknown |
| element-group-024 | 6 | selectedCurrencyLanguage | Неизвестно | unknown |
| element-group-025 | 6 | cookieBubble | Неизвестно | unknown |
| element-group-026 | 4 | catalogMenu | Неизвестно | unknown |
| element-group-027 | 4 | searchBarDesktop | Неизвестно | unknown |
| element-group-028 | 4 | searchBarDesktop | Неизвестно | unknown |
| element-group-029 | 4 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-030 | 4 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-034 | 4 | advBanner | Неизвестно | unknown |
| element-group-035 | 4 | advBanner | Неизвестно | unknown |
| element-group-036 | 4 | advBanner | Неизвестно | unknown |
| element-group-037 | 4 | advBanner | Неизвестно | unknown |
| element-group-038 | 4 | advBanner | Неизвестно | unknown |
| element-group-040 | 2 | header | Неизвестно | unknown |
| element-group-044 | 2 | catalogMenu | Неизвестно | unknown |
| element-group-045 | 2 | catalogMenu | Неизвестно | unknown |
| element-group-046 | 2 | catalogMenu | Неизвестно | unknown |
| element-group-050 | 2 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-051 | 2 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-052 | 2 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-053 | 2 | profileMenuAnonymous | Неизвестно | unknown |
| element-group-055 | 2 | orderInfo | Неизвестно | unknown |
| element-group-056 | 2 | orderInfo | Неизвестно | unknown |
| element-group-057 | 2 | orderInfo | Неизвестно | unknown |
| element-group-058 | 2 | orderInfo | Неизвестно | unknown |
| element-group-059 | 2 | orderInfo | Неизвестно | unknown |
| element-group-061 | 2 | favoriteCounter | Неизвестно | unknown |
| element-group-062 | 2 | favoriteCounter | Неизвестно | unknown |
| element-group-063 | 2 | favoriteCounter | Неизвестно | unknown |
| element-group-064 | 2 | favoriteCounter | Неизвестно | unknown |
| element-group-065 | 2 | favoriteCounter | Неизвестно | unknown |
| element-group-067 | 2 | headerIcon | Неизвестно | unknown |
| element-group-068 | 2 | headerIcon | Неизвестно | unknown |
| element-group-069 | 2 | headerIcon | Неизвестно | unknown |
| element-group-070 | 2 | headerIcon | Неизвестно | unknown |
| element-group-071 | 2 | headerIcon | Неизвестно | unknown |
| element-group-077 | 2 | addressBookBarWeb | Неизвестно | unknown |
| element-group-079 | 2 | selectedCurrencyLanguage | Неизвестно | unknown |
| element-group-080 | 2 | selectedCurrencyLanguage | Неизвестно | unknown |
| element-group-081 | 2 | seasonWidget | Неизвестно | unknown |
| element-group-082 | 2 | seasonWidget | Неизвестно | unknown |
| element-group-083 | 2 | footer | Неизвестно | unknown |
| element-group-085 | 2 | footer | Неизвестно | unknown |
| element-group-086 | 2 | footer | Неизвестно | unknown |
| element-group-087 | 2 | footer | Неизвестно | unknown |
| element-group-088 | 2 | footer | Неизвестно | unknown |
| element-group-090 | 2 | footer | Неизвестно | unknown |
| element-group-092 | 1 | profileMenuAnonymous | Неизвестно | unknown |
