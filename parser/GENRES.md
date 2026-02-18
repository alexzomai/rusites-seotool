# Сбор жанров сайтов с liveinternet

## Подход

Liveinternet предоставляет отдельные TSV-эндпоинты для каждого жанра:

```
https://www.liveinternet.ru/rating/ru/{genre}/today.tsv
```

Парсим все жанры, строим маппинг `system_id -> [genres]`, джойним с основной таблицей.

## Известные слаги (проверены)

| Слаг | Название | Кол-во сайтов |
|------|----------|---------------|
| `media` | Новости и СМИ | 4123 |
| `sport` | Спорт | 1471 |
| `auto` | Авто | 3648 |
| `music` | Музыка | 817 |
| `games` | Игры | 1914 |
| `realty` | Недвижимость | 1207 |
| `health` | Медицина | 2508 |
| `finance` | Финансы | 579 |
| `science` | Наука и техника | 1385 |
| `education` | Обучение | 2807 |
| `culture` | Культура и искусство | 1750 |
| `humor` | Юмор | 232 |
| `photo` | Фото | 453 |
| `cinema` | Кино | 665 |

## Категории с сайта (слаги не найдены)

Из UI liveinternet видны категории, для которых слаги ещё не подобраны:

- Hi-End, MP3
- Банки, Безопасность, Бесплатное, Бухгалтерия
- Генеалогия, Города и регионы, Государство
- Дом и семья, Знакомства и общение
- Интернет, Компьютеры, Литература
- Непознанное, Общество, Персональные страницы
- Погода, Политика, Политические партии
- Предприятия, Путешествия, Работа, Развлечения
- Реклама, Связь, Софт, Справки
- Страхование, Строительство, Телевидение
- Товары и услуги, Хостинг

## Схема БД

Данные хранятся в трёх таблицах:

### `sites` — справочник сайтов
```sql
CREATE TABLE sites (
    system_id   TEXT PRIMARY KEY,  -- ID из liveinternet
    domain      TEXT,
    title       TEXT
);
```

### `traffic_daily` — ежедневный трафик
```sql
CREATE TABLE traffic_daily (
    system_id   TEXT REFERENCES sites(system_id),
    parse_date  DATE,
    visits      INTEGER,
    rating      INTEGER,
    PRIMARY KEY (system_id, parse_date)
);
```

### `site_genres` — жанры сайта
```sql
CREATE TABLE site_genres (
    system_id   TEXT REFERENCES sites(system_id),
    genre       TEXT,  -- слаг: media, sport, auto, ...
    PRIMARY KEY (system_id, genre)
);
```

## Процесс объединения

1. **Основной парсинг** (`/rating/ru/today.tsv`) заполняет `sites` и `traffic_daily`
2. **Жанровый парсинг** (`/rating/ru/{genre}/today.tsv`) для каждого слага:
   - извлекает `system_id` из каждой строки
   - делает upsert в `site_genres (system_id, genre)`
3. Джойн для запроса:
```sql
SELECT s.domain, s.title, t.visits, array_agg(sg.genre) AS genres
FROM sites s
JOIN traffic_daily t ON t.system_id = s.system_id
LEFT JOIN site_genres sg ON sg.system_id = s.system_id
WHERE t.parse_date = CURRENT_DATE
GROUP BY s.domain, s.title, t.visits;
```

### Важные нюансы
- Один сайт может быть в нескольких жанрах (поэтому отдельная таблица, не колонка)
- Жанровый парсинг можно запускать реже основного (раз в неделю достаточно — жанры меняются редко)
- `system_id` из жанрового TSV совпадает с `system_id` из основного TSV — это ключ для джойна

## TODO

- [ ] Найти слаги для оставшихся категорий (парсить HTML главной страницы рейтинга через браузерный UA)
- [ ] Реализовать жанровый парсер
- [ ] Реализовать миграции БД с этой схемой
- [ ] Настроить расписание: основной парсинг — ежедневно, жанры — еженедельно

## Регионы

Аналогичная структура URL:
```
https://www.liveinternet.ru/rating/{region}/today.tsv
```
Регионы не исследовались, но логика хранения та же — отдельная таблица `site_regions`.
