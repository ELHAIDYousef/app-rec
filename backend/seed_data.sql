-- ============================================================
-- SEED DATA - 3LM Solutions (ATS + Formation)
-- ============================================================
-- Executer depuis le dossier backend/ :
--   /c/xampp/mysql/bin/mysql -u root pfe < seed_data.sql
--
-- Comptes ATS (http://localhost:3000)
--   Admin        : admin@3lm.ma              / Admin123!
--   RH Dev       : rh.dev@3lm.ma             / Rh1234!
--   RH Marketing : rh.marketing@3lm.ma       / Rh1234!
--   Candidat 1   : alice.martin@gmail.com    / Cand1234!
--   Candidat 2   : bob.dupont@gmail.com      / Cand1234!
--   Candidat 3   : sarah.chen@gmail.com      / Cand1234!
--
-- Codes Formation (module Formation)
--   Formateur    : ADMIN-0001
--   Formateur    : FORM-TEST
--   Employe 1    : EMP-TEST1
--   Employe 2    : EMP-TEST2
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Nettoyage
TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `candidatures`;
TRUNCATE TABLE `offres`;
TRUNCATE TABLE `admins`;
TRUNCATE TABLE `ressources_humaines`;
TRUNCATE TABLE `candidats`;
TRUNCATE TABLE `utilisateurs`;
TRUNCATE TABLE `resultats`;
TRUNCATE TABLE `questions`;
TRUNCATE TABLE `formations`;
DELETE FROM `employes` WHERE `code_employe` IN ('ADMIN-0001','FORM-TEST','EMP-TEST1','EMP-TEST2');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- MODULE ATS
-- ============================================================

INSERT INTO `utilisateurs` (`id`, `nom`, `email`, `mot_de_passe`, `role`, `is_active`, `telephone`) VALUES
(1, 'Administrateur Principal', 'admin@3lm.ma',           '$2b$12$LcOf2qHIolzsmkptadGh5uJ9pcADYxMWMqG/WDZDWc4Pg1AjzTJc6', 'admin',    1, NULL),
(2, 'Marie Lefebvre',           'rh.dev@3lm.ma',          '$2b$12$K6zrjE1aQlbvRj60xnewIO7oFLBjxpdYNkreTZdAX3.qGikDDvtYO', 'rh',       1, NULL),
(3, 'Thomas Bernard',           'rh.marketing@3lm.ma',    '$2b$12$K6zrjE1aQlbvRj60xnewIO7oFLBjxpdYNkreTZdAX3.qGikDDvtYO', 'rh',       1, NULL),
(4, 'Alice Martin',             'alice.martin@gmail.com', '$2b$12$hgy86Mh2qng8sjYZDDJZ1O5Ky2rcyOO9c2AgN9SXTxb2AhWrx70QC', 'candidat', 1, '0612345678'),
(5, 'Bob Dupont',               'bob.dupont@gmail.com',   '$2b$12$hgy86Mh2qng8sjYZDDJZ1O5Ky2rcyOO9c2AgN9SXTxb2AhWrx70QC', 'candidat', 1, '0623456789'),
(6, 'Sarah Chen',               'sarah.chen@gmail.com',   '$2b$12$hgy86Mh2qng8sjYZDDJZ1O5Ky2rcyOO9c2AgN9SXTxb2AhWrx70QC', 'candidat', 1, '0634567890');

INSERT INTO `admins` (`id`, `departement`) VALUES
(1, 'Direction Generale');

INSERT INTO `ressources_humaines` (`id`, `departement`, `cal_link`, `cal_api_key`) VALUES
(2, 'Developpement Informatique', NULL, NULL),
(3, 'Marketing et Communication',  NULL, NULL);

INSERT INTO `candidats` (`id`) VALUES (4), (5), (6);

INSERT INTO `offres` (`id`, `titre`, `description`, `competences`, `date_debut`, `date_fin`, `statut`, `cree_par`) VALUES
(1,
 'Developpeur Full-Stack React/Python',
 'Nous recherchons un developpeur Full-Stack passionne pour rejoindre notre equipe tech. Vous travaillerez sur le developpement de nouvelles fonctionnalites de notre plateforme SaaS. Environnement agile, stack moderne, teletravail partiel possible.',
 '["React","Python","FastAPI","MySQL","Git","REST API"]',
 '2026-07-01', '2026-09-30', 'ouverte', 2),

(2,
 'Ingenieur Data Science et IA',
 'Rejoignez notre pole Data pour concevoir et deployer des modeles de machine learning appliques au traitement du langage naturel. Vous integrerez une equipe de 5 data scientists dans un contexte de startup en forte croissance.',
 '["Python","Machine Learning","NLP","scikit-learn","TensorFlow","SQL","Docker"]',
 '2026-07-15', '2026-10-15', 'ouverte', 2),

(3,
 'Designer UX/UI Senior',
 'Nous cherchons un designer UX/UI creatif pour concevoir des interfaces utilisateur intuitives et aesthetiques. Vous travaillerez en etroite collaboration avec les equipes produit et developpement.',
 '["Figma","Adobe XD","Prototypage","Design System","User Research","CSS"]',
 '2026-08-01', '2026-11-30', 'ouverte', 3),

(4,
 'Chef de Projet IT (Offre fermee)',
 'Poste de Chef de Projet IT pour superviser les projets de transformation numerique. Coordination des equipes techniques et metier, gestion du budget et des delais.',
 '["Gestion de projet","Scrum","JIRA","Communication","Leadership"]',
 '2026-01-01', '2026-04-30', 'fermee', 2);

INSERT INTO `candidatures`
  (`id`, `offre_id`, `user_id`, `motivation`, `cv_fichier`, `statut`,
   `score_nlp`, `score_groq`, `analyse_nlp`, `analyse_groq`,
   `traite_par`, `statut_modifie_le`)
VALUES
(1, 1, 4,
 'Developpeuse Full-Stack avec 3 ans d experience en React et Python. Mon experience chez TechStartup m a permis de maitriser FastAPI et les architectures REST. Je souhaite rejoindre une equipe dynamique.',
 NULL, 'selectionne', 78, 82,
 '{"ats_score":78,"skills_score":90,"experience_score":70,"cover_letter_score":65,"education_score":75,"keywords_score":85,"semantic_score":72,"matched_skills":["React","Python","FastAPI","REST API"],"missing_skills":["MySQL","Git"],"strengths":["Bonne correspondance des competences cles"],"weaknesses":["MySQL non mentionne"],"recommendation":"Candidat solide, recommande pour entretien","scoring_method":"nlp_pipeline"}',
 '{"ats_score":82,"skills_score":88,"experience_score":72,"cover_letter_score":70,"education_score":75,"keywords_score":88,"matched_skills":["React","Python","FastAPI","REST API","Git"],"missing_skills":["MySQL"],"strengths":["Experience pertinente en startup","Maitrise des technologies demandees"],"weaknesses":["MySQL non cite"],"recommendation":"Profil tres adapte. Recommande pour un entretien technique.","scoring_method":"groq_llm"}',
 2, NOW()),

(2, 1, 5,
 'Passionne par le developpement web, je me suis specialise en JavaScript/React. Mon profil junior mais motive me pousse a apprendre rapidement. Je cherche une premiere opportunite en entreprise.',
 NULL, 'examinee', 42, 38,
 '{"ats_score":42,"skills_score":55,"experience_score":20,"cover_letter_score":50,"education_score":60,"keywords_score":45,"semantic_score":40,"matched_skills":["React"],"missing_skills":["Python","FastAPI","MySQL","Git","REST API"],"strengths":["Connaissance de React"],"weaknesses":["Peu d experience","Manque de competences backend"],"recommendation":"Profil junior, competences partielles","scoring_method":"nlp_pipeline"}',
 '{"ats_score":38,"skills_score":45,"experience_score":15,"cover_letter_score":55,"education_score":65,"keywords_score":40,"matched_skills":["React"],"missing_skills":["Python","FastAPI","MySQL","REST API"],"strengths":["Motivation evidente"],"weaknesses":["Profil tres junior","Pas d experience backend"],"recommendation":"Profil junior ne correspondant pas aux exigences.","scoring_method":"groq_llm"}',
 2, NOW()),

(3, 2, 6,
 'Ingenieure en Data Science avec un Master en IA, j ai 4 ans d experience en NLP et machine learning. Python, scikit-learn et TensorFlow sont mes outils du quotidien.',
 NULL, 'selectionne', 91, 89,
 '{"ats_score":91,"skills_score":95,"experience_score":88,"cover_letter_score":85,"education_score":90,"keywords_score":95,"semantic_score":89,"matched_skills":["Python","NLP","Machine Learning","scikit-learn","TensorFlow","SQL"],"missing_skills":["Docker"],"strengths":["Excellente correspondance des competences","Experience solide en NLP"],"weaknesses":["Docker non mentionne"],"recommendation":"Candidat excellent, tres fortement recommande","scoring_method":"nlp_pipeline"}',
 '{"ats_score":89,"skills_score":93,"experience_score":85,"cover_letter_score":82,"education_score":90,"keywords_score":92,"matched_skills":["Python","NLP","Machine Learning","scikit-learn","TensorFlow","SQL"],"missing_skills":["Docker"],"strengths":["Master en IA tres pertinent","4 ans d experience ciblee"],"weaknesses":["Docker absent du profil"],"recommendation":"Candidat exceptionnel. Priorite haute pour l entretien.","scoring_method":"groq_llm"}',
 2, NOW()),

(4, 2, 4,
 'Bien que mon profil soit principalement oriente developpement web, j ai une forte appétence pour la Data Science et j ai suivi des cours en ligne sur Python ML.',
 NULL, 'en_attente', NULL, NULL, NULL, NULL, NULL, NULL),

(5, 3, 5,
 'Designer autodidacte passionne par l UX, je maitrise Figma et Adobe XD. J ai realise plusieurs projets personnels de design d applications mobiles et web.',
 NULL, 'refusee', 35, 30,
 '{"ats_score":35,"skills_score":50,"experience_score":15,"cover_letter_score":45,"education_score":40,"keywords_score":55,"semantic_score":30,"matched_skills":["Figma","Adobe XD"],"missing_skills":["Prototypage","Design System","User Research","CSS"],"strengths":["Connaissance des outils design"],"weaknesses":["Profil autodidacte sans experience professionnelle"],"recommendation":"Profil junior insuffisant pour un poste senior","scoring_method":"nlp_pipeline"}',
 NULL,
 3, NOW());

INSERT INTO `notifications` (`user_id`, `message`, `candidature_id`, `lue`) VALUES
(4, 'Votre candidature pour Developpeur Full-Stack React/Python a bien ete envoyee.',  1, 1),
(4, 'Vous avez ete selectionne(e) pour Developpeur Full-Stack React/Python.',          1, 0),
(4, 'Votre candidature pour Ingenieur Data Science et IA a bien ete envoyee.',         4, 1),
(5, 'Votre candidature pour Developpeur Full-Stack React/Python a bien ete envoyee.',  2, 1),
(5, 'Statut mis a jour pour Developpeur Full-Stack React/Python : Examinee.',          2, 0),
(5, 'Votre candidature pour Designer UX/UI Senior a bien ete envoyee.',                5, 1),
(5, 'Statut mis a jour pour Designer UX/UI Senior : Refusee.',                         5, 0),
(6, 'Votre candidature pour Ingenieur Data Science et IA a bien ete envoyee.',         3, 1),
(6, 'Vous avez ete selectionne(e) pour Ingenieur Data Science et IA.',                 3, 0);

-- ============================================================
-- MODULE FORMATION
-- ============================================================

INSERT INTO `employes` (`nom`, `code_employe`, `role`, `is_active`) VALUES
('Administrateur Formation', 'ADMIN-0001', 'formateur', 1),
('Formateur Test',           'FORM-TEST',  'formateur', 1),
('Alice Employe',            'EMP-TEST1',  'employe',   1),
('Bob Employe',              'EMP-TEST2',  'employe',   1);

INSERT INTO `formations` (`titre`, `contenu`, `cree_par`) VALUES
(
  'Introduction a Python pour le developpement web',
  'Python est un langage cree par Guido van Rossum en 1991. Il est utilise en developpement web, data science et IA. FastAPI est un framework Python moderne pour creer des APIs REST. La gestion des dependances se fait via pip et venv. Les concepts cles sont : listes, dictionnaires, fonctions, classes, decorateurs, async/await.',
  (SELECT `id` FROM `employes` WHERE `code_employe` = 'ADMIN-0001')
),
(
  'Gestion de projet avec Scrum et Agile',
  'Scrum est un cadre agile base sur des Sprints de 1 a 4 semaines. Les roles sont : Product Owner, Scrum Master, Equipe de developpement. Les ceremonies sont : Sprint Planning, Daily Scrum (15min), Sprint Review, Sprint Retrospective. Le Product Backlog liste toutes les fonctionnalites priorisees. Le Sprint Backlog contient les taches du Sprint en cours.',
  (SELECT `id` FROM `employes` WHERE `code_employe` = 'FORM-TEST')
);

INSERT INTO `questions` (`formation_id`, `type`, `question`, `options`, `bonne_reponse`, `ordre`) VALUES
(
  (SELECT `id` FROM `formations` WHERE `titre` = 'Introduction a Python pour le developpement web'),
  'qcm', 'Qui a cree Python ?',
  '["Linus Torvalds","Guido van Rossum","Dennis Ritchie","James Gosling"]',
  'Guido van Rossum', 0
),
(
  (SELECT `id` FROM `formations` WHERE `titre` = 'Introduction a Python pour le developpement web'),
  'qcm', 'Quel framework Python est utilise pour creer des APIs REST dans cette application ?',
  '["Django","Flask","FastAPI","Tornado"]',
  'FastAPI', 1
),
(
  (SELECT `id` FROM `formations` WHERE `titre` = 'Introduction a Python pour le developpement web'),
  'qcm', 'Quelle commande cree un environnement virtuel Python ?',
  '["pip create venv","python -m venv venv","virtualenv create","conda new venv"]',
  'python -m venv venv', 2
),
(
  (SELECT `id` FROM `formations` WHERE `titre` = 'Introduction a Python pour le developpement web'),
  'qcm', 'Quelle structure de donnees Python associe des cles a des valeurs ?',
  '["Liste","Tuple","Ensemble","Dictionnaire"]',
  'Dictionnaire', 3
),
(
  (SELECT `id` FROM `formations` WHERE `titre` = 'Introduction a Python pour le developpement web'),
  'ouverte', 'Expliquez la difference entre la programmation synchrone et asynchrone en Python.',
  NULL,
  'La programmation synchrone execute les taches une par une. La programmation asynchrone avec async/await permet plusieurs taches simultanees sans bloquer, utile pour les operations reseau et fichiers.', 4
),
(
  (SELECT `id` FROM `formations` WHERE `titre` = 'Gestion de projet avec Scrum et Agile'),
  'qcm', 'Quelle est la duree recommandee d un Sprint en Scrum ?',
  '["1 jour","1 a 4 semaines","3 mois","6 mois"]',
  '1 a 4 semaines', 0
),
(
  (SELECT `id` FROM `formations` WHERE `titre` = 'Gestion de projet avec Scrum et Agile'),
  'qcm', 'Quel role Scrum represente les interets du client ?',
  '["Scrum Master","Developpeur","Product Owner","Architecte"]',
  'Product Owner', 1
),
(
  (SELECT `id` FROM `formations` WHERE `titre` = 'Gestion de projet avec Scrum et Agile'),
  'qcm', 'Quelle ceremonie Scrum dure 15 minutes maximum ?',
  '["Sprint Planning","Sprint Review","Daily Scrum","Sprint Retrospective"]',
  'Daily Scrum', 2
),
(
  (SELECT `id` FROM `formations` WHERE `titre` = 'Gestion de projet avec Scrum et Agile'),
  'qcm', 'Qu est-ce que le Product Backlog ?',
  '["La liste des bugs","La liste priorisee de toutes les fonctionnalites","Le planning du Sprint","Le rapport de fin de Sprint"]',
  'La liste priorisee de toutes les fonctionnalites', 3
),
(
  (SELECT `id` FROM `formations` WHERE `titre` = 'Gestion de projet avec Scrum et Agile'),
  'ouverte', 'Quelle est la difference entre Sprint Review et Sprint Retrospective ?',
  NULL,
  'La Sprint Review presente le travail accompli aux parties prenantes pour recueillir du feedback produit. La Sprint Retrospective est interne a l equipe pour ameliorer le processus de travail.', 4
);
