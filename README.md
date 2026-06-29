# Predictive Maintenance AI Platform

Full-stack monorepo for turbofan engine fleet health monitoring and remaining useful life (RUL) prediction.

## Project structure

```
predictive-maintenance-ai-platform/
├── frontend/     # React + Vite dashboard (Google AI Studio generated)
├── backend/      # FastAPI API, database, ML pipeline
├── docs/         # Architecture, API contract, tickets
└── docker-compose.yml
```

## Current status

| Area | Status |
|------|--------|
| Frontend dashboard | ✅ Running — mock data, all pages preserved |
| Backend API | 🚧 Scaffold — health check + v1 router stub |
| Database | 🚧 Postgres configured in docker-compose, not wired yet |
| ML pipeline | 🚧 Directory structure ready, no models yet |
| MLflow | 🚧 Service in docker-compose, not integrated yet |

The frontend currently uses in-memory mock data. Backend endpoints, database models, and ML inference will be added in follow-up tickets (see `docs/tickets.md`).

## Run the frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set GEMINI_API_KEY if using Gemini features
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload
```

- Health: [http://localhost:8000/health](http://localhost:8000/health)
- API v1: [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)
- OpenAPI docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Run tests (backend)

```bash
cd backend
pytest
```

## Run with Docker Compose

From the repo root:

```bash
cp .env.example .env   # optional: set GEMINI_API_KEY
docker compose up --build
```

Services:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| Postgres | localhost:5432 |
| MLflow | http://localhost:5001 |

## Documentation

- [Architecture](docs/architecture.md)
- [API contract](docs/api-contract.md)
- [Tickets / roadmap](docs/tickets.md)

## Frontend pages

All original Google AI Studio pages are preserved under `frontend/src/pages/`:

- Fleet Dashboard, Engine Detail, Alerts, Models, Admin, Settings, Login
