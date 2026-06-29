/// <reference types="vite/client" />
/**
 * Centralized API client for FastAPI backend integration.
 *
 * - Demo Mode ON  → mock data (mockData.ts)
 * - Demo Mode OFF → VITE_API_BASE_URL + contract types → mapped view models
 *
 * See ./README.md and docs/API_CONTRACT.md.
 */
import {
  acknowledgeMockAlert,
  getMockActiveJob,
  getMockAlerts,
  getMockDatasetStatus,
  getMockEngineDetail,
  getMockFleet,
  getMockModels,
  resolveMockAlert,
  runMockPredict,
  triggerMockPipelineJob,
} from './mockData';
import {
  mapAlertsResponse,
  mapEngineDetail,
  mapFleetResponse,
  mapModelsResponse,
  mapPredictResponse,
  mapSensorHistory,
} from './mappers';
import { endpoints } from './endpoints';
import type {
  ApiAdminJobResponse,
  ApiAlertsQuery,
  ApiAlertsResponse,
  ApiEngineDetailResponse,
  ApiFleetResponse,
  ApiModelsResponse,
  ApiPredictRequest,
  ApiPredictResponse,
  ApiSensorHistoryResponse,
  ApiSensorsQuery,
} from './contract';
import type {
  AIModel,
  AlertItem,
  DatasetStatus,
  EngineDetail,
  FleetResponse,
  PipelineJob,
  PredictRequest,
  PredictResponse,
  SensorReading,
} from './types';

/** Backend origin only — /api/v1 paths are appended per endpoint. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

let isDemoMode = localStorage.getItem('demoMode') !== 'false';

export const setDemoMode = (value: boolean) => {
  isDemoMode = value;
};

export const getDemoMode = () => isDemoMode;

const delay = (ms = 250) => new Promise((res) => setTimeout(res, ms));

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(path, API_BASE_URL);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function fetchJson<T>(path: string, options: RequestInit = {}, query?: Record<string, string | number | undefined>): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchOrMock<T>(
  path: string,
  options: RequestInit = {},
  mockResolver: () => T | Promise<T>,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  if (!isDemoMode) {
    try {
      return await fetchJson<T>(path, options, query);
    } catch (err) {
      console.warn(`[API Client] ${path} failed, falling back to mock data:`, err);
    }
  }

  await delay(180);
  return mockResolver();
}

function mapAdminJobToPipeline(job: ApiAdminJobResponse, action: PipelineJob['action']): PipelineJob {
  return {
    jobId: job.job_id,
    action,
    status: job.status === 'started' ? 'running' : 'idle',
    progress: job.status === 'started' ? 10 : 0,
    logs: [job.message],
    startTime: new Date().toISOString(),
  };
}

function toApiPredictRequest(req: PredictRequest, engine?: EngineDetail | null): ApiPredictRequest {
  const latest = engine?.sensorHistory.at(-1);
  return {
    engine_id: req.engineId,
    cycle: engine?.latestCycle ?? 1,
    operational_settings: [0.001, 0.0002, 100.0],
    sensor_readings: {
      sensor_1: latest?.T24 ?? 518.67,
      sensor_2: latest?.T30 ?? 642.12,
      sensor_3: latest?.T50 ?? 1583.45,
      sensor_4: latest?.P30 ?? 1401.88,
      ...req.overrideSensors,
    },
  };
}

export const apiClient = {
  getFleet: async (): Promise<FleetResponse> => {
    if (!isDemoMode) {
      try {
        const data = await fetchJson<ApiFleetResponse>(endpoints.fleet);
        return mapFleetResponse(data);
      } catch (err) {
        console.warn('[API Client] /fleet failed, falling back to mock data:', err);
      }
    }
    await delay(180);
    return getMockFleet();
  },

  getEngine: async (engineId: string): Promise<EngineDetail> => {
    if (!isDemoMode) {
      try {
        const [detail, sensors] = await Promise.all([
          fetchJson<ApiEngineDetailResponse>(endpoints.engine(engineId)),
          fetchJson<ApiSensorHistoryResponse>(endpoints.engineSensors(engineId)),
        ]);
        return mapEngineDetail(detail, mapSensorHistory(sensors));
      } catch (err) {
        console.warn(`[API Client] /engines/${engineId} failed, falling back to mock data:`, err);
      }
    }

    await delay(180);
    const eng = getMockEngineDetail(engineId);
    if (!eng) throw new ApiError(404, `Engine ${engineId} not found`);
    return eng;
  },

  getEngineSensors: async (engineId: string, query?: ApiSensorsQuery): Promise<SensorReading[]> => {
    if (!isDemoMode) {
      try {
        const data = await fetchJson<ApiSensorHistoryResponse>(
          endpoints.engineSensors(engineId),
          { method: 'GET' },
          {
            from_cycle: query?.from_cycle,
            to_cycle: query?.to_cycle,
          },
        );
        return mapSensorHistory(data);
      } catch (err) {
        console.warn(`[API Client] /engines/${engineId}/sensors failed, falling back to mock:`, err);
      }
    }

    await delay(180);
    const eng = getMockEngineDetail(engineId);
    return eng ? eng.sensorHistory : [];
  },

  predictRul: async (req: PredictRequest): Promise<PredictResponse> => {
    if (!isDemoMode) {
      try {
        const engine = getMockEngineDetail(req.engineId);
        const body = toApiPredictRequest(req, engine);
        const data = await fetchJson<ApiPredictResponse>(endpoints.predict, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        return mapPredictResponse(req.engineId, data);
      } catch (err) {
        console.warn('[API Client] /predict failed, falling back to mock data:', err);
      }
    }

    await delay(180);
    const eng = getMockEngineDetail(req.engineId);
    if (!eng) throw new ApiError(404, 'Engine not found');

    const result = runMockPredict(req.engineId, req.simulatedCyclesToAdd || 10);
    return {
      engineId: req.engineId,
      originalRul: eng.estimatedRul + (req.simulatedCyclesToAdd || 10),
      predictedRul: result.predictedRul,
      confidenceScore: Number((0.92 - (result.predictedRul < 30 ? 0.08 : 0)).toFixed(2)),
      newRiskCategory: result.riskCategory,
      aiExplanation: `Model re-evaluated with +${req.simulatedCyclesToAdd || 10} cycles. Risk updated to ${result.riskCategory.toUpperCase()}.`,
    };
  },

  getAlerts: async (query?: ApiAlertsQuery): Promise<AlertItem[]> => {
    if (!isDemoMode) {
      try {
        const data = await fetchJson<ApiAlertsResponse>(
          endpoints.alerts,
          { method: 'GET' },
          {
            severity: query?.severity,
            status: query?.status,
            engine_id: query?.engine_id,
          },
        );
        return mapAlertsResponse(data);
      } catch (err) {
        console.warn('[API Client] /alerts failed, falling back to mock data:', err);
      }
    }

    await delay(180);
    return getMockAlerts();
  },

  acknowledgeAlert: async (alertId: string, userName?: string): Promise<AlertItem> => {
    if (!isDemoMode) {
      try {
        await fetchJson(endpoints.acknowledgeAlert(alertId), { method: 'POST' });
        const alerts = await apiClient.getAlerts();
        const updated = alerts.find((a) => a.alertId === alertId);
        if (updated) return { ...updated, status: 'acknowledged', acknowledgedBy: userName };
      } catch (err) {
        console.warn(`[API Client] acknowledge ${alertId} failed, falling back to mock:`, err);
      }
    }

    await delay(180);
    return acknowledgeMockAlert(alertId, userName);
  },

  resolveAlert: async (alertId: string): Promise<AlertItem> => {
    if (!isDemoMode) {
      try {
        await fetchJson(endpoints.resolveAlert(alertId), { method: 'POST' });
        const alerts = await apiClient.getAlerts();
        const updated = alerts.find((a) => a.alertId === alertId);
        if (updated) return { ...updated, status: 'resolved' };
      } catch (err) {
        console.warn(`[API Client] resolve ${alertId} failed, falling back to mock:`, err);
      }
    }

    await delay(180);
    return resolveMockAlert(alertId);
  },

  getModels: async (): Promise<AIModel[]> => {
    if (!isDemoMode) {
      try {
        const data = await fetchJson<ApiModelsResponse>(endpoints.models);
        return mapModelsResponse(data);
      } catch (err) {
        console.warn('[API Client] /models failed, falling back to mock data:', err);
      }
    }

    await delay(180);
    return getMockModels();
  },

  /** Frontend-only helper — not in API contract; mock-only until backend adds it. */
  getAdminStatus: async (): Promise<{ dataset: DatasetStatus; activeJob: PipelineJob }> => {
    if (!isDemoMode) {
      console.info('[API Client] /admin/status is not in API contract; using mock admin status.');
    }
    await delay(180);
    return {
      dataset: getMockDatasetStatus(),
      activeJob: getMockActiveJob(),
    };
  },

  loadDataset: async (): Promise<PipelineJob> => {
    if (!isDemoMode) {
      try {
        const data = await fetchJson<ApiAdminJobResponse>(endpoints.adminLoadDataset, { method: 'POST' });
        return mapAdminJobToPipeline(data, 'load_dataset');
      } catch (err) {
        console.warn('[API Client] /admin/datasets/load failed, falling back to mock:', err);
      }
    }

    await delay(180);
    return triggerMockPipelineJob('load_dataset');
  },

  preprocessDataset: async (): Promise<PipelineJob> => {
    if (!isDemoMode) {
      try {
        const data = await fetchJson<ApiAdminJobResponse>(endpoints.adminPreprocess, { method: 'POST' });
        return mapAdminJobToPipeline(data, 'preprocess');
      } catch (err) {
        console.warn('[API Client] /admin/preprocess failed, falling back to mock:', err);
      }
    }

    await delay(180);
    return triggerMockPipelineJob('preprocess');
  },

  trainModel: async (modelType: 'baseline' | 'lstm' | 'gru'): Promise<PipelineJob> => {
    if (!isDemoMode) {
      try {
        const data = await fetchJson<ApiAdminJobResponse>(endpoints.adminTrain, {
          method: 'POST',
          body: JSON.stringify({ model_type: modelType }),
        });
        const action = modelType === 'lstm' || modelType === 'gru' ? 'train_lstm' : 'train_baseline';
        return mapAdminJobToPipeline(data, action);
      } catch (err) {
        console.warn('[API Client] /admin/train failed, falling back to mock:', err);
      }
    }

    await delay(180);
    return triggerMockPipelineJob(modelType === 'lstm' || modelType === 'gru' ? 'train_lstm' : 'train_baseline');
  },
};
