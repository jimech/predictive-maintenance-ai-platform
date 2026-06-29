# Predictive Maintenance AI Platform — Project Context

## Project Name

`predictive-maintenance-ai-platform`

## Goal

Build a production-shaped AI engineering project that predicts machine failure risk and remaining useful life (RUL) using multivariate time-series sensor data.

The MVP uses the NASA C-MAPSS turbofan degradation dataset and includes:

- React dashboard generated with Google AI Studio
- FastAPI backend
- PostgreSQL database
- MLflow experiment tracking
- PyTorch model training
- Dockerized local development
- Authentication-ready structure
- Monitoring-ready API and prediction logs
- Deployable frontend/backend architecture

## Current Repo Status

The GitHub repository already contains a Google AI Studio generated React/Vite frontend at the repository root.

Current frontend-like structure:

```text
assets/
docs/
src/
  api/
  components/
  hooks/
  lib/
  pages/
    Admin.tsx
    Alerts.tsx
    EngineDetail.tsx
    FleetDashboard.tsx
    Login.tsx
    Models.tsx
    Settings.tsx
  App.tsx
  index.css
  main.tsx
.env.example
.gitignore
index.html
metadata.json
package-lock.json
package.json
README.md
tsconfig.json
vite.config.ts
```

## Important Instruction for Cursor

Do **not** delete, rewrite, or restart the generated frontend.

The first engineering step is to convert the existing frontend-only repo into a monorepo:

```text
predictive-maintenance-ai-platform/
  frontend/
  backend/
  docs/
  docker-compose.yml
  .env.example
  README.md
```

The existing Google AI Studio frontend should be moved into `/frontend` and preserved.

## MVP Scope

### Must Have

- User authentication-ready frontend routes
- Load and preprocess NASA C-MAPSS data
- Train one baseline tabular model
- Train one sequence model, LSTM or GRU
- Track experiments with MLflow
- Expose RUL prediction through FastAPI
- Store engines, sensor readings, predictions, model runs, users, and alerts in PostgreSQL
- Display fleet overview, engine detail, sensor trends, failure risk, RUL, confidence interval, and recommendations
- Generate warning and critical alerts based on RUL/risk thresholds
- Run locally through Docker Compose

### Should Have

- Basic explainability using feature importance or SHAP
- Model comparison table with MAE, RMSE, and optional NASA score
- Role-based access for admin, engineer, operator, and viewer
- API request logging, prediction latency logging, health and readiness endpoints

### Could Have

- Simulated real-time data stream
- Sensor drift monitoring
- Uncertainty estimation
- Maintenance cost optimization

### Won't Have in MVP

- Direct industrial IoT integration
- Safety-critical autonomous maintenance decisions
- Complex multi-tenant billing
- Kubernetes-first deployment

## Recommended Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Plotly.js |
| Backend API | Python, FastAPI, Pydantic |
| Database | PostgreSQL, SQLAlchemy, Alembic |
| ML | Pandas, NumPy, scikit-learn, PyTorch |
| Experiment Tracking | MLflow |
| Auth | Auth0 or Clerk |
| Deployment | Docker Compose first, then Render/Fly.io/Cloud Run |
| Monitoring | Structured logs, health checks, prediction logs |

## Execution Strategy

1. Preserve existing Google AI Studio frontend.
2. Move frontend into `/frontend`.
3. Create FastAPI backend in `/backend`.
4. Define API contract before implementing complex ML.
5. Build mock-compatible backend endpoints.
6. Connect frontend to backend.
7. Add database.
8. Add dataset loader.
9. Add feature engineering.
10. Add baseline model.
11. Add MLflow.
12. Add inference service.
13. Add alerts.
14. Add auth.
15. Add LSTM/GRU.
16. Add explainability.
17. Add monitoring and deployment.
