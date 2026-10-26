/**
 * Палитра MintKitchen — используется во всех приложениях.
 * 
 * ВАЖНО ДЛЯ БЭКЕНДЕРА: цвета не связаны с API, это чисто визуальные токены.
 */
export const colors = {
  mint:       '#9AF0D8',  // основной акцент
  mintSoft:   '#D8FAF0',  // светлая мята (фоны бейджей)
  mintDark:   '#6CC8AE',  // тёмная мята (ховеры)
  blue:       '#94C8F6',  // вторичный акцент
  blueSoft:   '#E0F0FD',  // светлый голубой
  coffee:     '#694D4B',  // кофейный (текст, тёмные кнопки, сайдбар)
  coffeeDark: '#503735',  // тёмный кофе (плеер)
  coffeeLight:'#917674',  // светлый кофе (вторичный текст)
  white:      '#FFFFFF',
  bg:         '#FAFDFC',  // светлый фон страниц
  bgBlue:     '#F4F9FE',  // голубоватый фон
  border:     '#E5EEE9',
  muted:      '#8A9A94',
} as const;

export type ColorName = keyof typeof colors;