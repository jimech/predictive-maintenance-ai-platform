# Predictive Maintenance Backend

FastAPI backend for the predictive maintenance AI platform.

## Local development

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-dev.txt
python -m pytest
python -m uvicorn app.main:app --reload
```

If `source .venv/bin/activate` does not work, run commands with the venv Python directly:

```bash
cd backend
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

- Health check: `GET /health`
- Readiness: `GET /ready`
- API v1: `GET /api/v1/`

## Environment variables

Copy `.env.example` to `.env` and adjust as needed. See root `.env.example` for shared variables.

## Tests

```bash
pytest
```

Integration tests use `TEST_DATABASE_URL` (default: `predictive_maintenance_test`). Start Postgres first:

```bash
docker compose up -d postgres
```

## Database migrations

```bash
alembic upgrade head
```

Create a new migration after model changes:

```bash
alembic revision --autogenerate -m "describe change"
```

## C-MAPSS dataset loader (FD001)

Place `train_FD001.txt`, `test_FD001.txt`, and `RUL_FD001.txt` in a directory, then:

```python
from pathlib import Path
from app.ml.data import compute_training_rul_labels, load_fd001, save_raw_artifacts

dataset = load_fd001(Path("/path/to/cmapss/FD001"))
paths = save_raw_artifacts(dataset, Path("app/ml/data/artifacts"))
labeled_train = compute_training_rul_labels(dataset.train, cap=130)
```

## Docker

```bash
docker build -t predictive-maintenance-backend .
docker run -p 8000:8000 predictive-maintenance-backend
```

Or use the root `docker-compose.yml`.
