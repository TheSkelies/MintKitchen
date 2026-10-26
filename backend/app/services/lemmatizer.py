"""
Лемматизация русских слов через pymorphy3.

Приводит слово к начальной форме:
  «яйца» → «яйцо», «яиц» → «яйцо», «молоко» → «молоко», «молочко» → «молочко».

Используется в matcher.py и cooker.py для сравнения ингредиентов.
"""
import re
from functools import lru_cache

try:
    import pymorphy3

    # Единственный экземпляр анализатора на весь процесс (создаётся долго)
    _morph = pymorphy3.MorphAnalyzer()
except Exception:
    _morph = None


@lru_cache(maxsize=1024)
def lemmatize_word(word: str) -> str:
    """Лемматизирует одно слово. Кэширует результаты."""
    if not word:
        return ""
    # Оставляем только буквы и цифры (убираем эмодзи, знаки)
    cleaned = re.sub(r"[^\wа-яё]", "", word.lower()).strip()
    if not cleaned:
        return ""
    if _morph is None:
        return cleaned
    parsed = _morph.parse(cleaned)
    if not parsed:
        return cleaned
    return parsed[0].normal_form.lower()


def lemmatize(text: str) -> str:
    """
    Лемматизирует фразу (несколько слов через пробел).
    Возвращает строку из лемм, разделённых пробелом.
    """
    if not text:
        return ""
    words = text.strip().split()
    return " ".join(lemmatize_word(w) for w in words if w)


def is_match(text_a: str, text_b: str) -> bool:
    """
    Проверяет, совпадают ли два названия после лемматизации.
    Учитывает частичное совпадение (одно содержится в другом).
    
    Примеры:
        is_match("яйца", "яйцо") → True
        is_match("молоко", "молочко") → True (благодаря частичному)
        is_match("яйца", "молоко") → False
    """
    a = lemmatize(text_a)
    b = lemmatize(text_b)
    if not a or not b:
        return False
    if a == b:
        return True
    # Частичное совпадение — если одно слово содержится в другом
    return a in b or b in a
