# SmartFinance Manager 🚀

**SmartFinance Manager** est une plateforme moderne et intelligente de gestion financière personnelle, conçue autour d'une architecture microservices robuste et hautement évolutive.

---

## 👥 Auteurs (Binôme)
Ce projet a été réalisé en binôme par :
- **Yassine Gouiga**
- **Oussama Id Omar**

---

## 🏗️ Architecture et Technologies

L'application est divisée en une interface utilisateur réactive (Frontend) et une série de services spécialisés (Backend) communiquant de manière asynchrone.

### Stack Technique
- **Frontend** : React, TypeScript, Vite, Tailwind CSS (Architecture SPA).
- **Backend** : FastAPI (Python), SQLAlchemy (ORM asynchrone), Pydantic.
- **Bases de données** : PostgreSQL (une base logique par microservice) & Redis (Mise en cache, Pub/Sub, File d'attente).
- **Authentification** : Firebase Authentication (Gestion des tokens JWT).
- **Infrastructure & Déploiement** : Docker, Docker Compose, Nginx (Reverse Proxy), GitHub Actions (CI/CD).

---

## 🧩 Microservices

L'architecture est découpée en 6 microservices indépendants :

1. **Service User** : Gère les informations des utilisateurs et fait office de proxy avec Firebase.
2. **Service Transaction** : Gère l'historique des revenus et dépenses, ainsi que la catégorisation.
3. **Service Budget** : Permet la définition de budgets mensuels et la gestion de "Pots d'épargne" (Saving Pots). Écoute les transactions en temps réel via Redis.
4. **Service Billing** : Gère les factures récurrentes, les abonnements et les échéances.
5. **Service Analytics** : Agrège les données pour le tableau de bord (Dashboard) et génère des rapports financiers poussés.
6. **Service Notification** : Service centralisé pour l'envoi d'alertes (dépassement de budget, factures impayées, rapports hebdomadaires/mensuels) via des templates email optimisés.

---

## 🎨 Patrons de Conception (Design Patterns)

Pour garantir un code propre, maintenable et évolutif, nous avons implémenté plusieurs design patterns classiques (GoF) au cœur de nos microservices :

### 1. Modèles Structurels
* **Facade Pattern** (`service-analytics`) : Le `DashboardFacade` masque la complexité des multiples appels de services (transactions, budgets, factures) pour fournir une API unifiée et simple au frontend.
* **Composite Pattern** (`service-analytics`) : Le `ReportComposite` permet de construire des rapports financiers hiérarchiques (ex: des catégories contenant des sous-catégories) qui peuvent être traités de manière uniforme.
* **Flyweight Pattern** (`service-transaction`) : Le `CategoryFlyweight` partage et met en cache les objets de catégorie en mémoire pour réduire drastiquement l'empreinte mémoire lors du traitement de gros volumes de transactions.
* **Bridge Pattern** (`service-notification`) : Sépare l'abstraction du type de notification (Alerte Budget, Facture...) de son implémentation de canal de livraison (Email, In-App).
* **Adapter Pattern** (`service-notification`) : Le `ResendAdapter` enveloppe le SDK d'envoi d'emails (Resend) pour qu'il respecte l'interface interne `EmailProvider`. Cela permet de changer de fournisseur d'emails sans modifier la logique métier.

### 2. Modèles Comportementaux
* **Strategy Pattern** (`service-notification`) : Définit une famille d'algorithmes de livraison (ex: `EmailNotificationStrategy`, `InAppNotificationStrategy`, `DualNotificationStrategy`) permettant au planificateur de changer dynamiquement le comportement d'envoi.
* **Observer Pattern / Pub-Sub** (`service-budget` & `service-analytics`) : Utilisation de Redis Pub/Sub (`event_listener`) pour réagir de manière asynchrone aux événements. Lorsqu'une transaction est ajoutée, le service de budget est notifié pour mettre à jour les plafonds de dépenses de façon réactive.

### 3. Modèles Créationnels & Décorateurs
* **Decorator Pattern** (`service-transaction`) : Utilisation de l'annotation `@audit_decorator` pour intercepter, journaliser et auditer automatiquement les opérations sensibles sur les transactions.

---

## 🚀 Installation et Déploiement Local

### Prérequis
- [Docker](https://www.docker.com/) et [Docker Compose](https://docs.docker.com/compose/) installés sur votre machine.

### Démarrage
1. Clonez le dépôt.
2. Créez un fichier `.env` à la racine (vous pouvez copier `.env.example`).
3. Assurez-vous d'avoir le fichier `firebase-service-account.json` à la racine pour l'authentification.
4. Lancez les conteneurs :
   ```bash
   docker-compose up --build -d
   ```
5. Accédez à l'application :
   - Frontend : `http://localhost` (ou port configuré)
   - API Gateway (Nginx) : `http://localhost/api/v1/...`

---

## 🔄 Intégration et Déploiement Continus (CI/CD)
Le projet intègre des pipelines GitHub Actions pour :
- **CI** : Tests automatisés (Pytest) exécutés sur chaque Pull Request, pour tous les microservices.
- **CD** : Déploiement automatisé via SSH sur le serveur de production, avec configuration HTTPS via Let's Encrypt et Nginx.
