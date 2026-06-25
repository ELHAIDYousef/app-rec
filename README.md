# 3LM Solutions — Application de Recrutement & Formation

Plateforme full-stack composée de deux modules intégrés : un **ATS (Applicant Tracking System)** pour gérer le recrutement, et un **module Formation** pour gérer les formations et évaluations internes des employés.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture technique](#2-architecture-technique)
3. [Module ATS — Recrutement](#3-module-ats--recrutement)
4. [Module Formation](#4-module-formation)
5. [Rôles et permissions](#5-rôles-et-permissions)
6. [Installation et démarrage](#6-installation-et-démarrage)
7. [Variables d'environnement](#7-variables-denvironnement)
8. [Comptes de test](#8-comptes-de-test)
9. [API — Routes principales](#9-api--routes-principales)
10. [Schéma de la base de données](#10-schéma-de-la-base-de-données)

---

## 1. Vue d'ensemble

| Caractéristique | Valeur |
|---|---|
| Nom de l'application | 3LM Solutions v5.0 |
| Backend | FastAPI (Python) |
| Frontend | React 18 |
| Base de données | MySQL (MariaDB via XAMPP) |
| ORM | SQLAlchemy 2.0 |
| Authentification | JWT (python-jose) |
| Scoring IA | NLP local (sentence-transformers) + Groq LLM |
| Email | Gmail SMTP |

L'application démarre sur un **sélecteur d'app** qui permet de choisir entre le module ATS et le module Formation.

---

## 2. Architecture technique

```
app-recrutement/
├── backend/                    # API FastAPI
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       # Paramètres (.env via Pydantic Settings)
│   │   │   ├── database.py     # Connexion SQLAlchemy + SessionLocal
│   │   │   ├── security.py     # JWT, hash bcrypt, require_role()
│   │   │   ├── email.py        # Envoi d'emails Gmail SMTP
│   │   │   └── ats.py          # Pipeline NLP scoring CV
│   │   ├── models/
│   │   │   ├── user.py         # User (admin, rh, candidat) — héritage joint
│   │   │   ├── offer.py        # Offres d'emploi
│   │   │   ├── application.py  # Candidatures
│   │   │   ├── notification.py # Notifications en temps réel
│   │   │   └── formation.py    # Employe, Formation, Question, Resultat
│   │   ├── routers/
│   │   │   ├── auth.py         # Inscription / connexion / profil
│   │   │   ├── offers.py       # CRUD offres
│   │   │   ├── applications.py # CRUD candidatures + scoring IA
│   │   │   ├── notifications.py# Lecture/marquage notifications
│   │   │   ├── admin.py        # Gestion utilisateurs (admin only)
│   │   │   ├── ai.py           # Routes IA (génération texte offre)
│   │   │   ├── cal.py          # Intégration Cal.com (entretiens)
│   │   │   └── formation/
│   │   │       ├── auth_router.py      # Login par code employé
│   │   │       ├── formateur_router.py # CRUD formations/employés (formateur)
│   │   │       └── employe_router.py   # Passer les tests (employé)
│   │   ├── schemas/            # Schémas Pydantic (validation I/O)
│   │   └── main.py             # Point d'entrée FastAPI
│   ├── requirements.txt
│   └── .env                    # Configuration locale (non versionné)
│
├── frontend/                   # SPA React
│   ├── src/
│   │   ├── App.jsx             # Routeur principal + sélecteur d'app
│   │   ├── context/
│   │   │   └── AuthContext.jsx # État global d'authentification
│   │   ├── pages/
│   │   │   ├── auth/           # Page de connexion/inscription
│   │   │   ├── candidate/      # Offres, postuler, mes candidatures, notifs
│   │   │   ├── rh/             # Gérer offres, candidatures, dossier candidat
│   │   │   ├── admin/          # Gestion utilisateurs, offres globales
│   │   │   └── formation/      # Module formation (login, dashboard, test)
│   │   └── api/
│   │       └── index.js        # Client Axios centralisé
│   └── package.json
│
└── pfe.sql                     # Dump MySQL complet (structure + données)
```

---

## 3. Module ATS — Recrutement

### Flux complet du recrutement

```
Candidat s'inscrit
       ↓
Consulte les offres ouvertes
       ↓
Postule (lettre de motivation + CV PDF)
       ↓
Scoring automatique déclenché en arrière-plan
   ├── NLP local (sentence-transformers + spaCy)
   └── Groq LLM (llama-3.3-70b-versatile) [si GROQ_API_KEY configuré]
       ↓
RH consulte le dossier candidat (score NLP + score Groq + analyse détaillée)
       ↓
RH change le statut : en_attente → examinée → sélectionné / refusée / embauché
       ↓
Notification envoyée au candidat (in-app + email)
   └── Si sélectionné : lien Cal.com pour réserver un entretien
```

### Scoring IA — Comment ça marche

Le système calcule deux scores indépendants sur 100 :

| Score | Méthode | Description |
|---|---|---|
| **Score NLP** | Local (sentence-transformers) | Similarité sémantique CV+motivation vs offre, détection compétences, analyse structurelle |
| **Score Groq** | API Groq (LLM) | Analyse approfondie par LLM, points forts/faibles, compétences matchées/manquantes, recommandation |

### Statuts d'une candidature

```
en_attente → examinée → sélectionné → embauché
                      ↘ refusée
```

---

## 4. Module Formation

### Acteurs

| Rôle | Accès | Description |
|---|---|---|
| **Formateur** | Code `FORM-XXXX` ou `ADMIN-XXXX` | Crée des formations, gère les employés, voit les résultats |
| **Employé** | Code `EMP-XXXX` | Accède aux formations assignées, passe les tests |

### Flux

```
Formateur crée une formation (titre + contenu textuel ou PDF)
       ↓
Groq LLM génère automatiquement les questions QCM + ouvertes
       ↓
Employé se connecte avec son code
       ↓
Employé passe le test (questions générées par IA)
       ↓
Résultat enregistré (note, réponses, corrections IA, durée)
```

### Authentification Formation

La formation utilise un système **séparé** du module ATS. Pas d'email/mot de passe : connexion par **code d'accès unique** (`EMP-XXXX`, `FORM-XXXX`, `ADMIN-XXXX`).

---

## 5. Rôles et permissions

### Module ATS

| Fonctionnalité | Candidat | RH | Admin |
|---|:---:|:---:|:---:|
| S'inscrire | ✅ | — | — |
| Voir les offres ouvertes | ✅ | ✅ | ✅ |
| Postuler à une offre | ✅ | — | — |
| Voir ses candidatures | ✅ | — | — |
| Recevoir des notifications | ✅ | — | — |
| Créer/modifier des offres | — | ✅ (ses offres) | ✅ (toutes) |
| Voir toutes les candidatures | — | ✅ (ses offres) | ✅ (toutes) |
| Changer statut candidature | — | ✅ | ✅ |
| Gérer les utilisateurs | — | — | ✅ |
| Voir les statistiques | — | ✅ | ✅ |
| Configurer Cal.com | — | ✅ | — |

### Module Formation

| Fonctionnalité | Employé | Formateur |
|---|:---:|:---:|
| Se connecter par code | ✅ | ✅ |
| Voir les formations disponibles | ✅ | ✅ |
| Passer un test | ✅ | — |
| Voir ses résultats | ✅ | — |
| Créer une formation | — | ✅ |
| Gérer les employés | — | ✅ |
| Voir tous les résultats | — | ✅ |

---

## 6. Installation et démarrage

### Prérequis

- Python 3.10+
- Node.js 18+
- XAMPP (MySQL/MariaDB sur port 3306)

### 1. Base de données

1. Démarrer XAMPP (Apache + MySQL)
2. Ouvrir phpMyAdmin → créer la base `pfe`
3. Importer `pfe.sql` **OU** exécuter `seed_data.py` (voir [Comptes de test](#8-comptes-de-test))

### 2. Backend

```bash
cd backend

# Créer et activer l'environnement virtuel
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

# Installer les dépendances
pip install -r requirements.txt

# Configurer l'environnement
# Vérifier/modifier .env selon votre setup

# Lancer le serveur
uvicorn app.main:app --reload --port 8000
```

Le backend sera disponible sur : `http://localhost:8000`
Documentation Swagger : `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Le frontend sera disponible sur : `http://localhost:3000`

---

## 7. Variables d'environnement

Fichier : `backend/.env`

```env
# Base de données MySQL (XAMPP par défaut)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=pfe

# JWT — changer en production !
SECRET_KEY=dev_secret_key_change_in_production_abc123xyz
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=7

# Fichiers uploadés (CVs)
UPLOAD_DIR=uploads
MAX_UPLOAD_MB=10

# Groq IA — optionnel, scoring désactivé si vide
# Inscription gratuite : https://console.groq.com
GROQ_API_KEY=

# Email Gmail SMTP — optionnel, emails désactivés si vide
# Utiliser un "mot de passe d'application" Google (16 caractères)
MAIL_USER=votre.email@gmail.com
MAIL_PASS=xxxx xxxx xxxx xxxx
MAIL_FROM_NAME=App Recrutement
```

---

## 8. Comptes de test

Exécuter le script de seed pour créer tous les comptes de test :

```bash
cd backend
python seed_data.py
```

### Module ATS — Connexion via http://localhost:3000

| Rôle | Email | Mot de passe | Accès |
|---|---|---|---|
| **Admin** | `admin@3lm.ma` | `Admin123!` | Tout (gestion utilisateurs, offres, candidatures) |
| **RH — Développement** | `rh.dev@3lm.ma` | `Rh1234!` | Ses offres + candidatures |
| **RH — Marketing** | `rh.marketing@3lm.ma` | `Rh1234!` | Ses offres + candidatures |
| **Candidat 1** | `alice.martin@gmail.com` | `Cand1234!` | Consulter offres, postuler |
| **Candidat 2** | `bob.dupont@gmail.com` | `Cand1234!` | Consulter offres, postuler |
| **Candidat 3** | `sarah.chen@gmail.com` | `Cand1234!` | Consulter offres, postuler |

### Module Formation — Connexion par code d'accès

| Rôle | Code d'accès | Nom |
|---|---|---|
| **Formateur Principal** | `ADMIN-0001` | Administrateur Formation |
| **Formateur** | `FORM-TEST` | Formateur Test |
| **Employé 1** | `EMP-TEST1` | Alice Employé |
| **Employé 2** | `EMP-TEST2` | Bob Employé |

### Données créées par le script

- **4 offres d'emploi** (3 ouvertes + 1 fermée)
- **5 candidatures** avec scores NLP simulés
- **2 formations** avec questions générées

---

## 9. API — Routes principales

Base URL : `http://localhost:8000`

### Authentification

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/api/auth/inscription` | Public | Créer un compte candidat |
| POST | `/api/auth/connexion` | Public | Se connecter (retourne JWT) |
| GET | `/api/auth/moi` | Tous | Profil de l'utilisateur connecté |
| PATCH | `/api/auth/moi` | Tous | Modifier son profil |
| POST | `/api/auth/moi/changer-mot-de-passe` | Tous | Changer son mot de passe |
| PATCH | `/api/auth/moi/cal` | RH | Configurer lien Cal.com |

### Offres

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/offres` | Tous | Lister les offres (filtre par statut) |
| GET | `/api/offres/{id}` | Tous | Détail d'une offre |
| POST | `/api/offres` | RH/Admin | Créer une offre |
| PATCH | `/api/offres/{id}` | RH/Admin | Modifier une offre |
| DELETE | `/api/offres/{id}` | RH/Admin | Supprimer une offre |

### Candidatures

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/api/candidatures` | Candidat | Postuler (multipart/form-data avec CV PDF) |
| GET | `/api/candidatures/mes-candidatures` | Candidat | Ses candidatures |
| GET | `/api/candidatures` | RH/Admin | Toutes les candidatures (filtres + tri IA) |
| GET | `/api/candidatures/{id}` | RH/Admin/Candidat | Dossier complet |
| GET | `/api/candidatures/{id}/cv` | RH/Admin/Candidat | Télécharger le CV |
| PATCH | `/api/candidatures/{id}/statut` | RH/Admin | Changer le statut |
| POST | `/api/candidatures/{id}/relancer-nlp` | RH/Admin | Relancer le scoring NLP |
| POST | `/api/candidatures/{id}/relancer-groq` | RH/Admin | Relancer le scoring Groq |

### Administration

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/admin/utilisateurs` | Admin | Lister tous les utilisateurs |
| POST | `/api/admin/utilisateurs` | Admin | Créer un RH ou Admin |
| PATCH | `/api/admin/utilisateurs/{id}/activer` | Admin | Activer/désactiver un compte |
| DELETE | `/api/admin/utilisateurs/{id}` | Admin | Supprimer un utilisateur |
| GET | `/api/admin/statistiques` | RH/Admin | Tableau de bord statistiques |

### Notifications

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/notifications` | Candidat | Ses notifications |
| PATCH | `/api/notifications/{id}/lue` | Candidat | Marquer comme lue |
| PATCH | `/api/notifications/lire-tout` | Candidat | Tout marquer comme lu |

### Formation

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/api/formation/auth/login` | Public | Connexion par code employé |
| GET | `/api/formation/auth/moi` | Employe/Formateur | Profil formation |
| GET | `/api/formation/formateur/employes` | Formateur | Lister les employés |
| POST | `/api/formation/formateur/employes` | Formateur | Créer un employé |
| POST | `/api/formation/formateur/formateurs` | Formateur | Créer un formateur |
| GET | `/api/formation/formateur/formations` | Formateur | Lister les formations |
| POST | `/api/formation/formateur/formations` | Formateur | Créer une formation (PDF ou texte) |
| DELETE | `/api/formation/formateur/formations/{id}` | Formateur | Supprimer une formation |
| GET | `/api/formation/employe/formations` | Employé | Formations disponibles |
| POST | `/api/formation/employe/formations/{id}/soumettre` | Employé | Soumettre un test |
| GET | `/api/formation/employe/resultats` | Employé | Ses résultats |

---

## 10. Schéma de la base de données

### Module ATS


```
utilisateurs (id, nom, email, mot_de_passe, role, is_active, telephone, cree_le)
    ├── admins (id → utilisateurs.id, departement)
    ├── ressources_humaines (id → utilisateurs.id, departement, cal_link, cal_api_key)
    └── candidats (id → utilisateurs.id)

offres (id, titre, description, competences[JSON], date_debut, date_fin, statut, cree_par → utilisateurs.id, cree_le)

candidatures (id, offre_id, user_id, motivation, cv_fichier, statut,
              score_nlp, score_groq, analyse_nlp[JSON], analyse_groq[JSON],
              traite_par, statut_modifie_le, postule_le)

notifications (id, user_id, message, candidature_id, lue, cree_le)
```

### Module Formation

```
employes (id, nom, code_employe, role[employe|formateur], is_active, cree_le)

formations (id, titre, contenu, pdf_fichier, cree_par → employes.id, cree_le)

questions (id, formation_id, type[qcm|ouverte], question, options[JSON],
           bonne_reponse, ordre)

resultats (id, employe_id, formation_id, note, reponses[JSON],
           corrections[JSON], duree_min, passe_le)
```

### Statuts

| Table | Champ | Valeurs |
|---|---|---|
| `offres` | `statut` | `ouverte`, `fermee` |
| `candidatures` | `statut` | `en_attente`, `examinee`, `selectionne`, `refusee`, `embauche` |
| `employes` | `role` | `employe`, `formateur` |
| `questions` | `type` | `qcm`, `ouverte` |

---

## Notes importantes

- **Les candidats s'inscrivent eux-mêmes** via la page d'inscription. L'admin ne peut créer que des comptes RH ou Admin.
- **Le scoring IA est asynchrone** : après une candidature, les scores NLP et Groq sont calculés en arrière-plan. Actualiser le dossier après quelques secondes.
- **Le scoring Groq est optionnel** : il ne s'active que si `GROQ_API_KEY` est renseigné dans `.env`.
- **Les emails sont optionnels** : désactivés si `MAIL_USER`/`MAIL_PASS` sont vides.
- **Un RH ne voit que ses propres offres et candidatures** — l'admin voit tout.
- **La formation utilise un JWT séparé** stocké dans `localStorage` sous la clé `formation_token`.
