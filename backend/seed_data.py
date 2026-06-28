"""
Seed sample offres and sujets_stage.
Run from backend/: python3 seed_data.py
"""
import sys, os
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal, engine, Base
import app.models.user   # noqa
import app.models.stage  # noqa
import app.models.offer  # noqa

from app.models.user import User
from app.models.offer import Offre, StatutOffre
from app.models.stage import SujetStage

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Fetch creator IDs
    rh        = db.query(User).filter(User.role == "rh").first()
    encadrant = db.query(User).filter(User.role == "encadrant").first()
    admin     = db.query(User).filter(User.role == "admin").first()

    if not rh:
        print("ERROR: No RH user found. Run create_test_accounts.py first.")
        sys.exit(1)

    # ── Offres ────────────────────────────────────────────────────────────────
    OFFRES = [
        Offre(
            titre="Développeur Full-Stack React / FastAPI",
            description=(
                "Nous recherchons un développeur full-stack passionné pour rejoindre notre équipe produit. "
                "Vous participerez au développement de notre plateforme SaaS RH : nouvelles fonctionnalités, "
                "optimisation des performances et amélioration de l'UX. Environnement agile, code review rigoureux."
            ),
            competences=["React", "FastAPI", "Python", "SQLAlchemy", "Docker", "Git"],
            date_debut=date(2026, 7, 1),
            date_fin=date(2026, 8, 31),
            statut=StatutOffre.ouverte,
            cree_par=rh.id,
        ),
        Offre(
            titre="Ingénieur Data / Machine Learning",
            description=(
                "Rejoignez notre équipe Data pour construire et déployer des modèles de scoring CV basés sur le NLP. "
                "Vous travaillerez sur des pipelines de traitement de texte, l'entraînement de modèles et "
                "leur intégration dans notre API de recrutement."
            ),
            competences=["Python", "scikit-learn", "NLP", "spaCy", "Pandas", "FastAPI", "Docker"],
            date_debut=date(2026, 7, 15),
            date_fin=date(2026, 9, 15),
            statut=StatutOffre.ouverte,
            cree_par=rh.id,
        ),
        Offre(
            titre="DevOps / Cloud Engineer",
            description=(
                "Vous serez en charge de l'automatisation de nos pipelines CI/CD, de la gestion de notre "
                "infrastructure cloud (AWS/GCP) et du monitoring applicatif. Vous travaillerez en étroite "
                "collaboration avec les équipes dev pour améliorer la fiabilité et la scalabilité de nos services."
            ),
            competences=["Docker", "Kubernetes", "Terraform", "GitHub Actions", "AWS", "Linux"],
            date_debut=date(2026, 7, 1),
            date_fin=date(2026, 8, 15),
            statut=StatutOffre.ouverte,
            cree_par=rh.id,
        ),
        Offre(
            titre="Développeur Mobile React Native",
            description=(
                "Nous développons une application mobile RH pour nos clients. Vous concevrez et implémenterez "
                "de nouvelles fonctionnalités, gérerez les notifications push et assurerez la compatibilité "
                "iOS/Android. Bonne maîtrise de l'écosystème JavaScript requise."
            ),
            competences=["React Native", "JavaScript", "TypeScript", "REST API", "Git", "Expo"],
            date_debut=date(2026, 8, 1),
            date_fin=date(2026, 9, 30),
            statut=StatutOffre.ouverte,
            cree_par=rh.id,
        ),
        Offre(
            titre="Analyste Cybersécurité",
            description=(
                "Dans le cadre du renforcement de notre posture de sécurité, nous recrutons un analyste "
                "cybersécurité. Vous réaliserez des audits de vulnérabilités, analyserez les logs de sécurité "
                "et proposerez des mesures correctives pour protéger nos infrastructures et données clients."
            ),
            competences=["Pentest", "OWASP", "Wireshark", "Linux", "SIEM", "Python"],
            date_debut=date(2026, 7, 1),
            date_fin=date(2026, 7, 31),
            statut=StatutOffre.ouverte,
            cree_par=rh.id,
        ),
        Offre(
            titre="UX/UI Designer",
            description=(
                "Vous travaillerez sur la refonte de notre interface utilisateur. Vos missions : wireframing, "
                "prototypage sur Figma, tests utilisateurs et collaboration étroite avec les développeurs "
                "front-end pour garantir une implémentation fidèle aux maquettes."
            ),
            competences=["Figma", "UX Research", "Prototypage", "Design System", "CSS"],
            date_debut=date(2026, 8, 15),
            date_fin=date(2026, 10, 15),
            statut=StatutOffre.fermee,
            cree_par=rh.id,
        ),
    ]

    # ── Sujets de stage ───────────────────────────────────────────────────────
    enc_nom = encadrant.nom if encadrant else "Encadrant Test"
    enc_id  = encadrant.id  if encadrant else None
    cree_id = admin.id      if admin else rh.id

    SUJETS = [
        SujetStage(
            titre="Plateforme de gestion de stages avec IA",
            description=(
                "Conception et développement d'une application web complète permettant la gestion du cycle de vie "
                "des stagiaires : candidature, affectation, suivi Scrum, évaluation et génération de rapports. "
                "Intégration d'un assistant IA pour accompagner les stagiaires."
            ),
            technologies=["React", "FastAPI", "Python", "MySQL", "Docker", "Groq API"],
            niveau_requis="master",
            encadrant=enc_nom,
            encadrant_id=enc_id,
            statut="disponible",
            cree_par=cree_id,
        ),
        SujetStage(
            titre="Système de scoring CV par NLP",
            description=(
                "Développement d'un moteur d'analyse automatique des CV et lettres de motivation basé sur "
                "des techniques NLP (TF-IDF, embeddings). Le système doit calculer un score de correspondance "
                "entre un candidat et une offre d'emploi et produire un rapport d'analyse détaillé."
            ),
            technologies=["Python", "spaCy", "scikit-learn", "FastAPI", "Pandas", "NLP"],
            niveau_requis="master",
            encadrant=enc_nom,
            encadrant_id=enc_id,
            statut="disponible",
            cree_par=cree_id,
        ),
        SujetStage(
            titre="Application mobile de suivi RH",
            description=(
                "Conception d'une application mobile cross-platform permettant aux candidats de suivre leurs "
                "candidatures, recevoir des notifications en temps réel et planifier des entretiens. "
                "Le backend sera développé en FastAPI et exposera une API REST documentée."
            ),
            technologies=["React Native", "Expo", "FastAPI", "WebSockets", "Push Notifications"],
            niveau_requis="licence",
            encadrant=enc_nom,
            encadrant_id=enc_id,
            statut="disponible",
            cree_par=cree_id,
        ),
        SujetStage(
            titre="Tableau de bord analytique RH",
            description=(
                "Création d'un dashboard interactif pour les responsables RH afin de visualiser les KPIs "
                "de recrutement : taux de conversion, délai moyen d'embauche, sources de candidature, "
                "cartographie des compétences. Génération automatique de rapports PDF."
            ),
            technologies=["React", "Recharts", "FastAPI", "Python", "ReportLab", "MySQL"],
            niveau_requis="licence",
            encadrant=enc_nom,
            encadrant_id=enc_id,
            statut="disponible",
            cree_par=cree_id,
        ),
        SujetStage(
            titre="Automatisation des tests et CI/CD",
            description=(
                "Mise en place d'une stratégie de tests complète (unitaires, intégration, E2E) et d'un pipeline "
                "CI/CD automatisé pour une application web full-stack. Objectif : zéro régression en production "
                "et déploiement continu sur un environnement cloud."
            ),
            technologies=["Pytest", "Playwright", "GitHub Actions", "Docker", "AWS", "Nginx"],
            niveau_requis="ingenieur",
            encadrant=enc_nom,
            encadrant_id=enc_id,
            statut="disponible",
            cree_par=cree_id,
        ),
        SujetStage(
            titre="Chatbot RH basé sur LLM",
            description=(
                "Développement d'un chatbot intelligent intégré dans la plateforme RH, capable de répondre "
                "aux questions des candidats, d'analyser leur profil et de les orienter vers les offres "
                "correspondantes. Utilisation des API LLM (Groq/OpenAI) avec RAG sur la base de données."
            ),
            technologies=["Python", "LangChain", "Groq API", "FastAPI", "React", "Vector DB"],
            niveau_requis="master",
            encadrant=enc_nom,
            encadrant_id=enc_id,
            statut="affecte",
            cree_par=cree_id,
        ),
    ]

    # Insert offres
    offres_created = 0
    for o in OFFRES:
        exists = db.query(Offre).filter(Offre.titre == o.titre).first()
        if not exists:
            db.add(o)
            offres_created += 1
            print(f"  OK  [offre]   {o.titre[:60]}")
        else:
            print(f"  --  [offre]   SKIP  {o.titre[:60]}")

    # Insert sujets
    sujets_created = 0
    for s in SUJETS:
        exists = db.query(SujetStage).filter(SujetStage.titre == s.titre).first()
        if not exists:
            db.add(s)
            sujets_created += 1
            print(f"  OK  [sujet]   {s.titre[:60]}")
        else:
            print(f"  --  [sujet]   SKIP  {s.titre[:60]}")

    db.commit()
    print(f"\n  {offres_created} offre(s) créée(s), {sujets_created} sujet(s) créé(s).")

except Exception as e:
    db.rollback()
    print(f"\nERROR: {e}")
    import traceback; traceback.print_exc()
    sys.exit(1)
finally:
    db.close()
