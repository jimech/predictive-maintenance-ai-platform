# Frontend Context

## Current Situation

The frontend was generated first using Google AI Studio.

It is currently a React/Vite frontend at the repository root. It should be preserved and moved into `/frontend`.

## Do Not

- Do not delete the existing frontend.
- Do not rewrite all generated pages.
- Do not replace the frontend with a new app.
- Do not hardcode secrets or tokens.
- Do not use `localStorage` for sensitive auth tokens.

## Target Frontend Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui-style components
- React Router
- TanStack Query if already present or easy to add
- Plotly.js / react-plotly.js
- Environment variable: `VITE_API_BASE_URL`

## Target Pages

```text
src/pages/
  Login.tsx
  FleetDashboard.tsx
  EngineDetail.tsx
  Alerts.tsx
  Models.tsx
  Admin.tsx
  Settings.tsx
```

## UX Requirements

### Login Page

- Product logo/title
- Login button
- Product description
- Error state

### Fleet Dashboard

- KPI cards: Total engines, Critical engines, Warning engines, Average RUL, Open alerts
- Risk distribution chart
- RUL histogram
- Fleet table: Engine ID, Latest cycle, Estimated RUL, Health score, Failure probability, Risk category, Open alerts, View details button

### Engine Detail

- RUL estimate card
- Confidence interval
- Health score gauge
- Failure probability line chart
- Multi-sensor trend chart
- Top contributing sensors bar chart
- Maintenance recommendation panel
- Alert history table

### Alerts Page

- Severity filter
- Status filter
- Alert table/cards
- Acknowledge button
- Resolve button

### Models Page

- Model comparison table
- MAE
- RMSE
- NASA score
- Production model badge

### Admin/Data Page

- Dataset status
- Load dataset button
- Run preprocessing button
- Train baseline model button
- Train LSTM/GRU model button
- Job status area

## Frontend API Files

Expected files:

```text
src/api/client.ts
src/api/types.ts
src/api/mockData.ts
src/hooks/useFleet.ts
src/hooks/useEngine.ts
src/hooks/useAlerts.ts
src/hooks/useModels.ts
```

If these files already exist, improve them instead of replacing them.

## Demo Mode

Add or preserve a frontend Demo Mode.

Expected behavior:

- Demo Mode enabled: use mock data.
- Demo Mode disabled: call FastAPI using `VITE_API_BASE_URL`.
- Show visible “Demo Mode” badge in the top bar.

## Frontend/Backend Integration Rule

Frontend should call only documented backend endpoints:

```text
GET /api/v1/fleet
GET /api/v1/engines/{engine_id}
GET /api/v1/engines/{engine_id}/sensors
POST /api/v1/predict
GET /api/v1/alerts
POST /api/v1/alerts/{alert_id}/acknowledge
POST /api/v1/alerts/{alert_id}/resolve
GET /api/v1/models
POST /api/v1/admin/datasets/load
POST /api/v1/admin/preprocess
POST /api/v1/admin/train
```

## First Frontend Task After Monorepo

After moving the generated frontend into `/frontend`:

1. Run `npm install`.
2. Run `npm run dev`.
3. Confirm the app loads.
4. Identify API client and mock data files.
5. Ensure `VITE_API_BASE_URL` is used.
6. Do not add auth yet.
7. Do not connect ML yet.
