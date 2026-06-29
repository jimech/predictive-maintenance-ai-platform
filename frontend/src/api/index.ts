/**
 * Frontend API integration layer.
 *
 * | File          | Purpose                                      |
 * |---------------|----------------------------------------------|
 * | client.ts     | Centralized API client (single entry point)  |
 * | contract.ts   | Types matching docs/API_CONTRACT.md          |
 * | types.ts      | UI view models for pages/components          |
 * | mappers.ts    | contract → view model conversion             |
 * | endpoints.ts  | Route path constants                         |
 * | mockData.ts   | Demo Mode mock responses                     |
 *
 * ## Configuration
 *
 * Set in `frontend/.env.local`:
 *
 * ```env
 * VITE_API_BASE_URL=http://localhost:8000
 * ```
 *
 * ## Demo Mode
 *
 * - **ON** (default): all hooks use `mockData.ts` — no backend required.
 * - **OFF**: calls FastAPI at `VITE_API_BASE_URL`; falls back to mock on error.
 * - Toggle in the Layout top bar; persisted in `localStorage.demoMode`.
 *
 * ## Hooks → Client → Endpoints
 *
 * | Hook                    | Client method        | Endpoint                          |
 * |-------------------------|----------------------|-----------------------------------|
 * | useFleet                | getFleet             | GET /api/v1/fleet                 |
 * | useEngine               | getEngine            | GET /api/v1/engines/{id}          |
 * | useEngineSensors        | getEngineSensors     | GET /api/v1/engines/{id}/sensors  |
 * | usePredictRul           | predictRul           | POST /api/v1/predict              |
 * | useAlerts               | getAlerts            | GET /api/v1/alerts                |
 * | useAcknowledgeAlert     | acknowledgeAlert     | POST /api/v1/alerts/{id}/acknowledge |
 * | useResolveAlert         | resolveAlert         | POST /api/v1/alerts/{id}/resolve  |
 * | useModels               | getModels            | GET /api/v1/models                |
 * | useAdminStatus          | getAdminStatus       | (mock-only — not in contract yet) |
 * | usePipelineActions      | load/preprocess/train| POST /api/v1/admin/*              |
 *
 * ## Pages using API data (via hooks only)
 *
 * - FleetDashboard → useFleet
 * - EngineDetail → useEngine, useEngineSensors, usePredictRul, useAlerts
 * - Alerts → useAlerts, useAcknowledgeAlert, useResolveAlert
 * - Models → useModels
 * - Admin → useAdminStatus, usePipelineActions
 * - GlobalSearch → useFleet, useAlerts, useModels
 * - Layout → useAlerts (badge count), Demo Mode toggle
 *
 * Settings (useSettings) is local-only — not backed by API yet.
 */

export { apiClient, API_BASE_URL, ApiError, getDemoMode, setDemoMode } from './client';
export { endpoints, API_V1_PREFIX } from './endpoints';
export type * from './contract';
export type * from './types';
