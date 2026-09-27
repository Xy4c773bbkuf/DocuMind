import httpx

from .config import settings


async def generate(prompt: str) -> str | None:
    if not settings.ai_enabled or not settings.gemini_api_key:
        return None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, params={"key": settings.gemini_api_key}, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (httpx.HTTPError, KeyError, IndexError, TypeError):
        return None