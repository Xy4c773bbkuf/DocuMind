import re
from collections import Counter

STOPWORDS = set("the a an and or but if in on at to of for with from is are was were be this that it as by we you your our their".split())


def extract_keywords(text: str, limit: int = 10) -> list[tuple[str, int]]:
    words = re.findall(r"[A-Za-z][A-Za-z0-9'-]{2,}", text.lower())
    counts = Counter(w for w in words if w not in STOPWORDS)
    return counts.most_common(limit)

