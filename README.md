# Paris Éclat CRM

Plateforme CRM commerciale pour Paris Éclat.

## Stack

- **Backend**: Node.js + Express + TypeScript + PostgreSQL
- **Frontend**: React + Vite + TypeScript

## Setup rapide

### 1. Base de données

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Éditer .env avec vos clés API
npm install
npm run migrate   # Crée les tables + données de démo
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application est disponible sur **http://localhost:5173**

## Comptes de démo

| Utilisateur | Email | Mot de passe | Rôle |
|-------------|-------|--------------|------|
| Farid Benali | farid@pariseclat.com | farid123 | directeur |
| Olivier Dupont | olivier@pariseclat.com | olivier123 | commercial |

## Variables d'environnement backend

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL |
| `JWT_SECRET` | Clé secrète JWT |
| `CLAY_API_KEY` | Clé API Clay pour enrichissement |
| `ANTHROPIC_API_KEY` | Clé API Anthropic pour agents IA |
| `FRONTEND_URL` | URL du frontend (CORS) |

## API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion |
| GET | `/api/auth/me` | Utilisateur courant |
| GET | `/api/prospects` | Liste prospects |
| POST | `/api/prospects` | Créer prospect |
| PUT | `/api/prospects/:id` | Modifier prospect |
| POST | `/api/prospects/:id/enrich` | Enrichir via Clay |
| POST | `/api/prospects/:id/interactions` | Ajouter interaction |
| GET | `/api/clients` | Liste clients |
| GET | `/api/dashboard/stats` | Statistiques dashboard |
| POST | `/api/agents/analyze` | Analyse IA priorités |
| POST | `/api/agents/draft-email` | Rédaction email IA |
