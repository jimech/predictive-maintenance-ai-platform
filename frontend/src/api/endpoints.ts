/** API route paths relative to VITE_API_BASE_URL (see docs/API_CONTRACT.md). */

export const API_V1_PREFIX = '/api/v1';

export const endpoints = {
  health: '/health',
  ready: '/ready',
  fleet: `${API_V1_PREFIX}/fleet`,
  engine: (engineId: string) => `${API_V1_PREFIX}/engines/${engineId}`,
  engineSensors: (engineId: string) => `${API_V1_PREFIX}/engines/${engineId}/sensors`,
  predict: `${API_V1_PREFIX}/predict`,
  alerts: `${API_V1_PREFIX}/alerts`,
  acknowledgeAlert: (alertId: string) => `${API_V1_PREFIX}/alerts/${alertId}/acknowledge`,
  resolveAlert: (alertId: string) => `${API_V1_PREFIX}/alerts/${alertId}/resolve`,
  models: `${API_V1_PREFIX}/models`,
  adminLoadDataset: `${API_V1_PREFIX}/admin/datasets/load`,
  adminPreprocess: `${API_V1_PREFIX}/admin/preprocess`,
  adminTrain: `${API_V1_PREFIX}/admin/train`,
} as const;
