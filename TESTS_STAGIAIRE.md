# Tests — Module Stagiaire (F8 à F15)

> **Prérequis** : Backend FastAPI démarré (`uvicorn app.main:app --reload`),
> Frontend React démarré (`npm start`), GROQ_API_KEY configuré dans `.env`.

---

## ⚙️ Migrations Base de données

Lors du premier démarrage après ces modifications, `create_all` créera automatiquement les nouvelles tables.
Si la table `utilisateurs` existe déjà avec l'ancien type ENUM, exécutez :

```sql
-- Optionnel : si la colonne role est un ENUM (ancien schéma)
-- Le schéma a été migré vers VARCHAR(20), donc drop + recréer suffit
-- OU exécutez cette commande si vous voulez garder les données :
-- (aucune migration nécessaire si la colonne est déjà VARCHAR)
```

**Nouvelles tables créées automatiquement :**
- `stagiaires`
- `sujets_stage`
- `candidatures_stage`
- `profils_analyse`
- `cahiers_charges`
- `sprints`
- `taches_scrum`
- `daily_reports`
- `messages_assistant`

---

## 🧪 F8 — Gestion des Candidatures de Stage

### Test 1 — Inscription stagiaire

1. Aller sur `http://localhost:3000` → ATS App → `/login`
2. Cliquer sur **Inscription**
3. Sélectionner **Stagiaire** (bouton en haut du formulaire)
4. Remplir :
   - Nom : `Amine Benali`
   - Email : `amine.stagiaire@test.com`
   - Mot de passe : `Stage1234!`
   - Université : `ENSET Mohammedia`
   - Niveau : `ingenieur`
   - Spécialité : `Génie Informatique`
5. Cliquer **Créer mon compte stagiaire**
6. ✅ Attendu : Connexion automatique, redirection vers `/dashboard` avec interface stagiaire

**API directe :**
```bash
curl -X POST http://localhost:8000/api/auth/inscription-stagiaire \
  -H "Content-Type: application/json" \
  -d '{"nom":"Amine Benali","email":"amine@test.com","mot_de_passe":"Stage1234!","universite":"ENSET","niveau":"ingenieur","specialite":"Informatique"}'
```
✅ Attendu : `{"access_token":"...","user":{"role":"stagiaire",...}}`

---

### Test 2 — Dépôt de candidature (F8)

1. Se connecter en tant que stagiaire
2. Menu gauche → **Ma candidature**
3. Cliquer **+ Soumettre une candidature**
4. Remplir la lettre de motivation
5. Téléverser un CV (PDF)
6. Cliquer **Soumettre ma candidature**
7. ✅ Attendu : Toast succès, candidature affichée avec statut "En attente"

**Vérifications :**
- Le fichier CV est uploadé dans `backend/uploads/stage/`
- La candidature apparaît dans l'admin (`/admin/stages` → onglet Candidatures)

---

### Test 3 — Historique des candidatures

**API :**
```bash
curl http://localhost:8000/api/stage/candidatures/mes \
  -H "Authorization: Bearer <token_stagiaire>"
```
✅ Attendu : `{"items":[...],"total":1,"page":1,"pages":1}`

---

## 🤖 F9 — Assistant IA Multicanal

### Test 4 — Chat IA

1. Menu gauche → **Assistant IA**
2. Onglet **Chat IA** (sélectionné par défaut)
3. Taper : `Quels sont les sujets de stage disponibles en IA ?`
4. ✅ Attendu : Réponse de l'assistant en moins de 10 secondes

**Canaux disponibles :**
- `chat` — Conversation directe
- `email` — Simulation email (même interface)
- `whatsapp` — Simulation WhatsApp (même interface)
- `vocal` — Utilise Web Speech API (Chrome requis)

### Test 5 — Assistant Vocal

1. Onglet **Assistant Vocal** 🎙️
2. Cliquer sur le micro 🎙️
3. Parler : "Bonjour, je cherche un sujet de stage en développement web"
4. ✅ Attendu : Transcription → envoi à Groq → réponse lue à voix haute

### Test 6 — Email automatique (admin)

**API :**
```bash
curl -X POST http://localhost:8000/api/stage/assistant/email-auto/1 \
  -H "Authorization: Bearer <token_admin>"
```
✅ Attendu : Email généré + sauvegardé dans `message_ia` de la candidature

---

## 🔍 F10 — Analyse Intelligente du Profil

### Test 7 — Analyser le profil

1. Menu gauche → **Analyse de profil**
2. Cliquer **Analyser mon profil**
3. Coller un extrait de CV dans "Contenu de votre CV"
4. Ajouter quelques lignes de motivation
5. Cliquer **Lancer l'analyse IA**
6. ✅ Attendu (après ~5-10s) :
   - Niveau technique : `intermédiaire` ou `avancé`
   - Compétences : liste extraite du CV
   - Technologies maîtrisées : frameworks détectés
   - Domaine recommandé : ex. `Développement Web`
   - Score : 0-100
   - Résumé IA

**API directe :**
```bash
curl -X POST http://localhost:8000/api/stage/profil/analyser \
  -H "Authorization: Bearer <token_stagiaire>" \
  -H "Content-Type: application/json" \
  -d '{
    "cv_text": "Étudiant en 3ème année génie informatique. Maîtrise Python, Django, React. Projet: application web de gestion scolaire.",
    "motivation": "Je suis passionné par le développement web et souhite approfondir mes compétences en IA."
  }'
```
✅ Attendu : JSON avec `niveau_technique`, `competences`, `score`, `domaine_recommande`

---

## 📋 F11 — Gestion des Sujets de Stage

### Test 8 — Créer un sujet (Admin/RH)

1. Se connecter en admin
2. Menu → **Sujets & Stages**
3. Cliquer **+ Nouveau sujet**
4. Remplir :
   - Titre : `Application de gestion des stages avec IA`
   - Description : `Développement d'une plateforme web complète...`
   - Technologies : `React, FastAPI, Python, MySQL`
   - Niveau : `ingenieur`
   - Encadrant : `Dr. Mohammed Alaoui`
5. ✅ Attendu : Sujet créé avec statut "disponible"

### Test 9 — Consulter les sujets (Stagiaire)

1. Se connecter en tant que stagiaire
2. Menu → **Sujets disponibles**
3. ✅ Attendu : Grille des sujets avec technologies et niveau
4. Cliquer sur un sujet → Détail complet (description, technologies, encadrant)

**Statuts disponibles :** `disponible` → `reserve` → `affecte` → `termine`

---

## 🎯 F12 — Affectation Automatique des Sujets

### Test 10 — Matching IA

**Prérequis :** Une candidature existe + un profil analysé + au moins un sujet disponible

1. Admin → **Sujets & Stages** → onglet **Candidatures**
2. Trouver la candidature d'Amine
3. Cliquer **Matcher IA**
4. ✅ Attendu (5-10s) :
   - Sujet optimal proposé avec score (0-100)
   - Justification textuelle
   - Classement des 5 meilleurs sujets

5. Cliquer **Affecter ce sujet**
6. ✅ Attendu : Candidature mise à jour avec `sujet_id`, statut du sujet → "affecte"

**API :**
```bash
curl -X POST http://localhost:8000/api/stage/affectation/matcher/1 \
  -H "Authorization: Bearer <token_admin>"
```

---

## 📑 F13 — Génération du Cahier des Charges

### Test 11 — Générer le CDC

**Prérequis :** Candidature acceptée avec sujet affecté

1. Admin → **Sujets & Stages** → onglet **Candidatures**
2. Trouver la candidature acceptée
3. Cliquer **Cahier IA**
4. ✅ Attendu (10-15s) : Toast "Cahier des charges généré !"

5. Se reconnecter en stagiaire → Menu → **Cahier des charges**
6. ✅ Attendu : Document complet avec :
   - Présentation du projet
   - Objectifs (liste)
   - Périmètre fonctionnel
   - Technologies recommandées (frontend/backend/BDD/outils)
   - Livrables
   - Planning (5 phases)
   - Critères d'évaluation
   - Bouton **Imprimer / PDF**

**Export PDF :** Cliquer "Imprimer / PDF" → Ctrl+P dans le navigateur → Sauvegarder en PDF

---

## ⚡ F14 — Gestion Agile Scrum

### Test 12 — Générer le backlog automatiquement

**Prérequis :** Candidature acceptée + sujet affecté

1. Admin → **Sujets & Stages** → candidature → Cliquer **Backlog IA**
2. ✅ Attendu (10-15s) : "4 sprints générés avec succès"

### Test 13 — Tableau Scrum (Kanban)

1. Se connecter en stagiaire → **Tableau Scrum**
2. ✅ Attendu :
   - Sélecteur de sprints (Sprint 1, Sprint 2...)
   - Barre de progression du sprint
   - 4 colonnes : À faire / En cours / En validation / Terminé
   - Tâches générées par l'IA dans chaque colonne

3. Déplacer une tâche : Cliquer les boutons → (flèche de colonnes)
4. Ajouter une tâche : Bouton **+ Tâche** → remplir formulaire

### Test 14 — Daily Report

1. Tableau Scrum → Bouton **Daily Report**
2. Remplir :
   - Tâches réalisées : `Implémentation de l'authentification JWT`
   - Difficultés : `Problème de CORS à résoudre`
   - Tâches prévues : `Tests unitaires + documentation`
3. ✅ Attendu : Toast "Daily report soumis !"
4. Un seul report par sprint par jour (mise à jour si soumis 2 fois)

**API :**
```bash
curl -X POST http://localhost:8000/api/stage/scrum/daily-report \
  -H "Authorization: Bearer <token_stagiaire>" \
  -H "Content-Type: application/json" \
  -d '{"sprint_id":1,"realise":"Auth JWT","difficultes":"CORS","prevu":"Tests"}'
```

---

## 📊 F15 — Suivi Intelligent de l'Avancement

### Test 15 — Stats d'avancement

1. Stagiaire → Menu → **Mon avancement**
2. ✅ Attendu :
   - 4 stat cards (avancement global, tâches, terminées, daily reports)
   - Barre de progression par sprint
   - Alertes si retard/blocage détecté

### Test 16 — Analyse IA de l'avancement

1. **Mon avancement** → Bouton **Analyse IA**
2. ✅ Attendu (5-10s) :
   - Synthèse textuelle
   - Niveau de productivité (faible/moyen/bon/excellent)
   - Recommandations personnalisées
   - Pronostic de fin de stage
   - Alertes IA (retard, blocage, absence)

**API :**
```bash
curl http://localhost:8000/api/stage/avancement/stats \
  -H "Authorization: Bearer <token_stagiaire>"

curl http://localhost:8000/api/stage/avancement/analyse-ia \
  -H "Authorization: Bearer <token_stagiaire>"
```

---

## 🔗 Tests d'intégration bout-en-bout

### Scénario complet

```
1. Admin crée 3 sujets de stage variés
2. Stagiaire s'inscrit + dépose candidature + CV
3. Stagiaire analyse son profil avec l'IA
4. Stagiaire interagit avec l'assistant vocal
5. Admin fait le matching IA → affecte le meilleur sujet
6. Admin génère le cahier des charges
7. Admin génère le backlog Scrum (4 sprints)
8. Stagiaire accède au tableau Scrum
9. Stagiaire déplace des tâches sur le Kanban
10. Stagiaire soumet un daily report
11. Stagiaire consulte son avancement + analyse IA
```

---

## 🛑 Cas d'erreur à tester

| Test | Action | Attendu |
|------|---------|---------|
| Double candidature | Soumettre 2 candidatures | ❌ 400 "Vous avez déjà une candidature active" |
| Matcher sans sujet | Matcher si 0 sujets disponibles | ❌ 400 "Aucun sujet disponible" |
| Scrum sans stage | Accéder au Scrum sans candidature acceptée | ❌ 400 "Aucun stage actif" |
| Accès rôle invalide | Stagiaire → `/admin/users` | Redirection `/dashboard` |
| GROQ down | Analyser sans connexion internet | ❌ 502 "Erreur Groq" |

---

## 📁 Fichiers créés/modifiés

### Backend
| Fichier | F | Description |
|---------|---|-------------|
| `app/models/user.py` | — | Ajout rôle `stagiaire` + classe `Stagiaire` |
| `app/models/stage.py` | F8-F15 | 7 nouveaux modèles DB |
| `app/core/groq_helper.py` | — | Helper Groq partagé |
| `app/routers/auth.py` | F8 | Endpoint `/inscription-stagiaire` |
| `app/routers/stage/candidatures.py` | F8 | Dépôt/gestion candidatures |
| `app/routers/stage/sujets.py` | F11 | CRUD sujets de stage |
| `app/routers/stage/profil.py` | F10 | Analyse IA du profil |
| `app/routers/stage/affectation.py` | F12 | Matching + affectation IA |
| `app/routers/stage/cahier.py` | F13 | Génération CDC par IA |
| `app/routers/stage/scrum.py` | F14 | Sprints, tâches, daily reports |
| `app/routers/stage/avancement.py` | F15 | Stats + analyse IA avancement |
| `app/routers/stage/assistant.py` | F9 | Chat IA multicanal |
| `app/schemas/user.py` | — | Champs stagiaire dans UserOut |
| `app/main.py` | — | Enregistrement des 8 nouveaux routers |

### Frontend
| Fichier | F | Description |
|---------|---|-------------|
| `api/stage.js` | F8-F15 | Toutes les fonctions API stage |
| `pages/stagiaire/StagiaireDashboard.jsx` | — | Dashboard principal stagiaire |
| `pages/stagiaire/CandidatureStage.jsx` | F8 | Dépôt + historique candidature |
| `pages/stagiaire/SujetsDisponibles.jsx` | F11 | Grille des sujets disponibles |
| `pages/stagiaire/ProfilAnalyse.jsx` | F10 | Interface analyse IA profil |
| `pages/stagiaire/AssistantIA.jsx` | F9 | Chat + vocal + email + WhatsApp |
| `pages/stagiaire/CahierDesCharges.jsx` | F13 | Visualisation + export PDF |
| `pages/stagiaire/ScrumBoard.jsx` | F14 | Kanban + daily report |
| `pages/stagiaire/Avancement.jsx` | F15 | Stats + analyse IA avancement |
| `pages/admin/AdminSujetsPage.jsx` | F11+F12 | Admin : sujets + candidatures |
| `pages/auth/AuthPage.jsx` | F8 | Ajout inscription stagiaire |
| `components/layout/AppLayout.jsx` | — | Navigation stagiaire (8 items) |
| `App.jsx` | — | 7 nouvelles routes stagiaire |
| `Dashboard.jsx` | — | Branchement StagiaireDashboard |

---

## 🔐 Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | (existant) | (existant) |
| RH | (existant) | (existant) |
| Stagiaire | `amine.stagiaire@test.com` | `Stage1234!` |

---

## 🌐 Endpoints API Swagger

Accessible sur `http://localhost:8000/docs`

Tags disponibles :
- `Stage – F8 Candidatures`
- `Stage – F9 Assistant IA`
- `Stage – F10 Profil IA`
- `Stage – F11 Sujets`
- `Stage – F12 Affectation`
- `Stage – F13 Cahier des charges`
- `Stage – F14 Scrum`
- `Stage – F15 Avancement`
