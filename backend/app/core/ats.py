import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def analyze_cv(
    upload_dir: str,
    cv_filename: Optional[str],
    motivation: str,
    offer_title: str,
    offer_desc: str,
    skills: list,
) -> dict:
    """
    Full ATS pipeline — tries NLP libraries, falls back gracefully.
    """
    cv_text = ""

    # Stage 1: PDF extraction
    if cv_filename:
        filepath = os.path.join(upload_dir, cv_filename)
        if os.path.exists(filepath):
            try:
                import fitz
                doc = fitz.open(filepath)
                cv_text = "\n".join(page.get_text() for page in doc)
                doc.close()
            except ImportError:
                logger.warning("PyMuPDF not installed — no CV text extracted")
            except Exception as e:
                logger.error("PDF extraction failed: %s", e)

    # Stage 2-5: Try full NLP pipeline
    try:
        return _nlp_pipeline(cv_text, motivation, offer_title, offer_desc, skills)
    except Exception as e:
        logger.error("NLP pipeline failed: %s — using simple scoring", e)
        return _simple_score(cv_text, motivation, skills)


def _nlp_pipeline(cv_text, motivation, offer_title, offer_desc, skills):
    """Full pipeline with Sentence Transformers + spaCy."""
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity

    model     = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    full_text = f"{cv_text} {motivation}"
    offer_full= f"{offer_title}. {offer_desc}. {' '.join(skills)}"

    # Semantic score
    cv_vec    = model.encode([full_text[:3000]])
    off_vec   = model.encode([offer_full[:1000]])
    sim       = cosine_similarity(cv_vec, off_vec)[0][0]
    semantic  = min(100, int(max(0.0, (float(sim) - 0.2) / 0.7) * 100))

    # Skills score
    txt_lower = full_text.lower()
    matched   = [s for s in skills if s.lower() in txt_lower]
    missing   = [s for s in skills if s.lower() not in txt_lower]
    skills_sc = int(len(matched) / max(len(skills), 1) * 100)

    # Motivation score
    mot_hits  = sum(1 for s in skills if s.lower() in motivation.lower())
    mot_sc    = min(100, int(mot_hits / max(len(skills), 1) * 100) + 30)

    final = int(semantic * 0.4 + skills_sc * 0.4 + mot_sc * 0.2)

    return {
        "ats_score":          final,
        "skills_score":       skills_sc,
        "experience_score":   semantic,
        "cover_letter_score": mot_sc,
        "education_score":    max(0, semantic - 10),
        "keywords_score":     skills_sc,
        "semantic_score":     semantic,
        "matched_skills":     matched,
        "missing_skills":     missing,
        "strengths":          [f"Correspond a {len(matched)}/{len(skills)} competences requises"],
        "weaknesses":         [f"Competences manquantes: {', '.join(missing[:3])}"] if missing else [],
        "recommendation":     "Analyse NLP complete",
        "scoring_method":     "nlp_pipeline",
    }


def _simple_score(cv_text, motivation, skills):
    """Fallback: simple keyword matching when NLP libs not installed."""
    full = f"{cv_text} {motivation}".lower()
    matched = [s for s in skills if s.lower() in full]
    missing = [s for s in skills if s.lower() not in full]
    score   = int(len(matched) / max(len(skills), 1) * 100)
    return {
        "ats_score":          score,
        "skills_score":       score,
        "experience_score":   score,
        "cover_letter_score": score,
        "education_score":    score,
        "keywords_score":     score,
        "semantic_score":     0,
        "matched_skills":     matched,
        "missing_skills":     missing,
        "strengths":          [f"{len(matched)} competence(s) detectee(s)"],
        "weaknesses":         ["Installez sentence-transformers pour un scoring complet"],
        "recommendation":     "Scoring simplifie — installez les librairies NLP",
        "scoring_method":     "simple_keyword",
    }
