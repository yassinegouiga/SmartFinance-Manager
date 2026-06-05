# SmartFinance Manager

**SmartFinance Manager** est une application web de gestion de finances personnelles construite sur une architecture **microservices**. Elle permet de suivre ses revenus et dépenses, de définir des budgets, d'épargner via des « pots », de gérer ses factures récurrentes et de visualiser des analyses détaillées de ses finances.

L'interface adopte un design moderne (thème sombre par défaut, accent vert émeraude, police *Plus Jakarta Sans*) entièrement responsive, du bureau au mobile.

---

## ✨ Fonctionnalités

- **Tableau de bord** — solde total, revenus/dépenses du mois, taux d'épargne, flux de trésorerie sur 5 mois, transactions récentes, budgets et factures à venir.
- **Transactions** — ajout/suppression, filtres (recherche, type, catégorie, période), regroupement par date, export **CSV** et **PDF**.
- **Analyses (Analytics)** — répartition des dépenses par catégorie (donut), tendance revenus/dépenses, top des catégories, plages 3/6/12 mois.
- **Budgets** — limites mensuelles par catégorie avec suivi de progression et alertes de dépassement.
- **Pots d'épargne** — objectifs avec icône et couleur personnalisables, dépôts/retraits, suivi de progression.
- **Factures** — paiements récurrents, statut payé/impayé/en retard, rappels d'échéance.
- **Catégories** — catégories par défaut + catégories personnalisées (icône et couleur au choix).
- **Notifications** — alertes budget, rappels de factures, jalons d'épargne (in-app + e-mail).
- **Paramètres** — profil et photo de profil, thème clair/sombre, devise, changement de mot de passe, export et suppression de compte.
- **Authentification** — Firebase (e-mail/mot de passe avec vérification + connexion Google).

---

## 🏗️ Architecture

L'application est découpée en services indépendants, chacun avec son propre schéma de base de données isolé. La communication asynchrone entre services passe par **Redis (publication/abonnement)**.

```
                    ┌─────────────┐
   Navigateur ────► │ API Gateway │ (Nginx, HTTPS)
                    └──────┬──────┘
        ┌──────────┬──────┼───────────┬────────────┬──────────────┐
        ▼          ▼      ▼           ▼            ▼              ▼
   service-    service-  service-   service-     service-      service-
    user     transaction budget     billing     analytics    notification
        │          │      │           │            ▲              ▲
        └──────────┴──────┴───────────┴────────────┴──────────────┘
                         PostgreSQL (un schéma par service)
                                     │
                                   Redis  ── événements (transaction.created, …)
```

| Service | Responsabilité | Port interne |
|---|---|---|
| **service-user** | Profils, préférences (devise, thème), avatar | 8001 |
| **service-transaction** | Transactions et catégories | 8001 |
| **service-budget** | Budgets et pots d'épargne | 8003 |
| **service-billing** | Factures récurrentes et échéances | 8004 |
| **service-analytics** | Résumés mensuels, tableau de bord (écoute les événements Redis) | 8005 |
| **service-notification** | Notifications in-app et e-mails (Resend) | 8006 |
| **api-gateway** | Reverse-proxy Nginx, routage `/api/v1/*`, HTTPS | 80 / 443 |
| **frontend** | Application React (servie en production) | 80 |

---

## 🧩 Patrons de conception

Huit patrons de conception (Gang of Four) sont appliqués à travers le code :

| Patron | Emplacement |
|---|---|
| Proxy | `service-user` — cache des jetons Firebase |
| Decorator | `service-transaction` — journalisation d'audit des opérations CRUD |
| Flyweight | `service-transaction` — métadonnées partagées (icône/couleur de catégorie) |
| Composite | `service-analytics` — arbre de rapports financiers |
| Facade | `service-analytics` — agrégation des données du tableau de bord |
| Adapter | `service-notification` — abstraction du fournisseur d'e-mails |
| Strategy | `service-notification` — stratégies de livraison interchangeables |
| Bridge | `service-notification` — type de notification × canal de livraison |

---

## 🧰 Stack technique

**Frontend**
- React 18 + Vite 5
- React Router 6
- Firebase Authentication
- Chart.js (graphiques)
- Axios (appels API)
- CSS « design system » maison (tokens, thème clair/sombre)

**Backend**
- Python 3.12 + FastAPI
- SQLAlchemy (async) + PostgreSQL 16
- Redis 7 (pub/sub d'événements)
- Pydantic v2 (validation)
- Resend (envoi d'e-mails)
- Firebase Admin (vérification des jetons)

**Infrastructure**
- Docker & Docker Compose
- Nginx (API Gateway, HTTPS via Let's Encrypt)
- GitHub Actions (CI/CD)
- Azure VM (hébergement)

---

## 📂 Structure du projet

```
SmartFinance-Manager/
├── frontend/                 # Application React (Vite)
│   └── src/
│       ├── components/       # UI partagée, icônes, graphiques, layout
│       ├── context/          # Auth, catégories, notifications, header
│       ├── pages/            # Dashboard, Transactions, Analytics, …
│       ├── services/         # client API (axios)
│       └── utils/            # formatage (montants, dates), icônes
├── service-user/            # Microservice utilisateurs
├── service-transaction/     # Microservice transactions & catégories
├── service-budget/          # Microservice budgets & pots d'épargne
├── service-billing/         # Microservice factures
├── service-analytics/       # Microservice analyses & tableau de bord
├── service-notification/    # Microservice notifications & e-mails
├── nginx/                   # Configuration de l'API Gateway
├── docker-compose.yml       # Stack de développement
└── docker-compose.prod.yml  # Stack de production
```

Chaque microservice suit la même structure : `src/api` (routes), `src/crud`, `src/models`, `src/schemas`, `src/services`, `src/core` (config, base de données, sécurité), et `tests/`.

---

## 🚀 Démarrage en local

### Prérequis
- [Docker](https://www.docker.com/) et Docker Compose
- [Node.js](https://nodejs.org/) 18+ (pour le serveur de développement frontend)
- Un projet **Firebase** (Authentication activée) et le fichier `firebase-service-account.json`

### 1. Variables d'environnement

Créez un fichier `.env` à la racine (voir `.env.example`) :

```env
POSTGRES_PASSWORD=un_mot_de_passe_fort
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
RESEND_API_KEY=re_...
RESEND_FROM=SmartFinance <no-reply@votre-domaine>
VITE_API_URL=http://localhost:8888
```

Placez le fichier `firebase-service-account.json` à la racine du projet.

Créez `frontend/.env` avec la configuration Firebase côté client :

```env
VITE_API_URL=http://localhost:8888
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 2. Lancer les services backend

```bash
docker compose up -d --build
```

Cela démarre PostgreSQL, Redis et les six microservices. Les schémas et tables sont créés automatiquement au démarrage.

> **Note (développement).** La passerelle Nginx de production exige des certificats TLS. Pour le développement local, exposez une passerelle HTTP simple sur le port `8888` (via un `docker-compose.override.yml` local) afin que le serveur Vite puisse joindre l'API à travers une seule origine.

### 3. Lancer le frontend

```bash
cd frontend
npm install
npm run dev
```

L'application est disponible sur **http://localhost:5173**.

---

## 🧪 Tests

Les microservices sont testés avec **pytest** (SQLite en mémoire) :

```bash
cd service-budget        # ou tout autre service
pytest -q
```

Build de production du frontend :

```bash
cd frontend
npm run build
```

---

## 📦 Déploiement

Le déploiement est automatisé via **GitHub Actions** : à chaque fusion sur `main`, les images Docker sont reconstruites et déployées sur la VM Azure. La passerelle Nginx gère le HTTPS via **Let's Encrypt** et redirige tout le trafic vers le port 443.

La configuration de production se trouve dans `docker-compose.prod.yml`.

---

## 🎨 Design system

- **Accent :** vert émeraude (`#10b981` / `#34d399`)
- **Police :** Plus Jakarta Sans
- **Thèmes :** sombre (par défaut) et clair, via attribut `data-theme`
- **Tokens :** couleurs, rayons, ombres et espacements centralisés dans `frontend/src/index.css`

---

## 👤 Auteur

Projet développé par **Yassine Gouiga**.
