import json, re, httpx
from fastapi import HTTPException
from app.core.config import get_settings

GROQ_MODEL = "llama-3.3-70b-versatile"


def appeler_groq(messages: list, max_tokens: int = 1000, temperature: float = 0.7) -> str:
    cfg = get_settings()
    if not cfg.GROQ_API_KEY:
        raise HTTPException(400, "Clé GROQ_API_KEY non configurée dans .env")
    try:
        with httpx.Client(timeout=90) as client:
            r = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {cfg.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": messages,
                },
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, f"Erreur Groq API : {e.response.text[:300]}")
    except httpx.TimeoutException:
        raise HTTPException(504, "Délai dépassé — Groq met trop de temps à répondre. Réessayez.")
    except httpx.RequestError as e:
        raise HTTPException(502, f"Impossible de joindre Groq : {e}")


def appeler_groq_json(messages: list, max_tokens: int = 1500) -> dict:
    raw = appeler_groq(messages, max_tokens=max_tokens, temperature=0.2)

    # Extraire le JSON depuis un bloc markdown si nécessaire
    bloc = re.search(r"```(?:json)?\s*([\s\S]+?)```", raw)
    if bloc:
        raw = bloc.group(1).strip()
    else:
        # Trouver le premier { ... } de niveau racine
        start = raw.find("{")
        end   = raw.rfind("}")
        if start != -1 and end != -1:
            raw = raw[start:end + 1]

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(502, f"Réponse IA non parsable en JSON. Réessayez. ({exc})")
