import json, httpx, logging
from typing import List
from app.core.config import get_settings

logger = logging.getLogger(__name__)
GROQ_KEY = get_settings().GROQ_API_KEY
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL    = "llama-3.3-70b-versatile"

def _call(prompt: str, max_tokens: int = 2000) -> str:
    if not GROQ_KEY:
        raise ValueError("GROQ_API_KEY manquant dans le fichier .env — ajoutez GROQ_API_KEY=gsk_...")
    resp = httpx.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {GROQ_KEY}", "Content-Type": "application/json"},
        json={"model": MODEL, "max_tokens": max_tokens, "temperature": 0.3,
              "messages": [{"role": "user", "content": prompt}]},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]

def generer_questions(titre: str, contenu: str) -> List[dict]:
    prompt = (
        f"Tu es un formateur expert. Crée exactement 20 questions sur cette formation.\n"
        f"Titre : {titre}\n"
        f"Contenu :\n{contenu[:3000]}\n\n"
        f"Retourne UNIQUEMENT un tableau JSON valide avec 20 objets, sans texte avant ni après.\n"
        f"12 questions QCM et 8 questions ouvertes.\n"
        f"Format exact pour chaque objet :\n"
        f'{{"type":"qcm","question":"...","options":["A)...","B)...","C)...","D)..."],"bonne_reponse":"A)..."}}\n'
        f'{{"type":"ouverte","question":"...","options":null,"bonne_reponse":"..."}}'
    )
    raw = _call(prompt, 2000)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    qs = json.loads(raw.strip())
    return qs[:20]  # Garantir maximum 20 questions

def corriger(questions: List[dict], reponses: List[str]) -> dict:
    qr_pairs = "\n".join([
        f"Q{i+1} ({q['type']}) : {q['question']}\n"
        f"Réponse attendue : {q['bonne_reponse']}\n"
        f"Réponse de l'employé : {reponses[i] if i < len(reponses) else '(sans réponse)'}"
        for i, q in enumerate(questions)
    ])
    prompt = (
        f"Tu es un correcteur expert. Évalue les réponses de l'employé.\n\n{qr_pairs}\n\n"
        f"Retourne UNIQUEMENT un objet JSON valide sans texte avant ni après :\n"
        f'{{"note":0,"corrections":[{{"question":"...","reponse_employe":"...","bonne_reponse":"...","correct":true,"feedback":"..."}}]}}\n'
        f"note est un entier entre 0 et 100. Pour les QCM, correct=true si la réponse correspond exactement."
    )
    raw = _call(prompt, 2000)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())
