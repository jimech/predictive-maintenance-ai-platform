# Docker and Local Development

## Services

The local Docker Compose environment should include:

```text
frontend
backend
postgres
mlflow
```

## docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: maintenance
      POSTGRES_USER: maintenance
      POSTGRES_PASSWORD: maintenance
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mlflow:
    image: ghcr.io/mlflow/mlflow
    ports:
      - "5000:5000"
    command: >
      mlflow server
      --host 0.0.0.0
      --port 5000
      --backend-store-uri sqlite:///mlflow.db
      --default-artifact-root /mlflow/artifacts
    volumes:
      - mlflow_data:/mlflow

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+psycopg://maintenance:maintenance@postgres:5432/maintenance
      MLFLOW_TRACKING_URI: http://mlflow:5000
      ENVIRONMENT: local
    depends_on:
      - postgres
      - mlflow

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_BASE_URL: http://localhost:8000
    depends_on:
      - backend

volumes:
  postgres_data:
  mlflow_data:
```

## Root .env.example

```env
ENVIRONMENT=local

POSTGRES_DB=maintenance
POSTGRES_USER=maintenance
POSTGRES_PASSWORD=maintenance
DATABASE_URL=postgresql+psycopg://maintenance:maintenance@localhost:5432/maintenance

MLFLOW_TRACKING_URI=http://localhost:5000

VITE_API_BASE_URL=http://localhost:8000

AUTH_PROVIDER=auth0
AUTH0_DOMAIN=
AUTH0_AUDIENCE=
AUTH0_ISSUER=
```

## Backend Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install -e .

COPY app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Frontend Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

## Local Commands

### Run frontend only

```bash
cd frontend
npm install
npm run dev
```

### Run backend only

```bash
cd backend
pip install -e .
uvicorn app.main:app --reload
```

### Run all services

```bash
docker compose up --build
```

## Expected Local URLs

```text
Frontend: http://localhost:5173
Backend:  http://localhost:8000
Health:   http://localhost:8000/health
MLflow:   http://localhost:5000
Postgres: localhost:5432
```

## Health Checks

Backend should expose:

```text
GET /health
GET /ready
```

`/health` means the API process is alive.

`/ready` means database and model dependencies are ready.
