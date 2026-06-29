/// <reference types="vite/client" />
/**
 * Centralized API client for FastAPI backend integration.
 *
 * - Demo Mode ON  → mock data (mockData.ts)
 * - Demo Mode OFF → VITE_API_BASE_URL + contract types → mapped view models
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

async function fetchJson<T>(
  path: string,
  options: RequestInit = {},
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new ApiError(
      response.status,
      detail || `Request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

async function withDemoMode<T>(mockResolver: () => T | Promise<T>, apiResolver: () => Promise<T>): Promise<T> {
  if (isDemoMode) {
    await delay(180);
    return mockResolver();
  }
  return apiResolver();
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
  getFleet: (): Promise<FleetResponse> =>
    withDemoMode(
      () => getMockFleet(),
      async () => {
        const data = await fetchJson<ApiFleetResponse>(endpoints.fleet);
        return mapFleetResponse(data);
      },
    ),

  getEngine: (engineId: string): Promise<EngineDetail> =>
    withDemoMode(
      () => {
        const eng = getMockEngineDetail(engineId);
        if (!eng) throw new ApiError(404, `Engine ${engineId} not found`);
        return eng;
      },
      async () => {
        const [detail, sensors] = await Promise.all([
          fetchJson<ApiEngineDetailResponse>(endpoints.engine(engineId)),
          fetchJson<ApiSensorHistoryResponse>(endpoints.engineSensors(engineId)),
        ]);
        return mapEngineDetail(detail, mapSensorHistory(sensors));
      },
    ),

  getEngineSensors: (engineId: string, query?: ApiSensorsQuery): Promise<SensorReading[]> =>
    withDemoMode(
      () => {
        const eng = getMockEngineDetail(engineId);
        return eng ? eng.sensorHistory : [];
      },
      async () => {
        const data = await fetchJson<ApiSensorHistoryResponse>(
          endpoints.engineSensors(engineId),
          { method: 'GET' },
          { from_cycle: query?.from_cycle, to_cycle: query?.to_cycle },
        );
        return mapSensorHistory(data);
      },
    ),

  predictRul: (req: PredictRequest): Promise<PredictResponse> =>
    withDemoMode(
      async () => {
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
      async () => {
        const eng = getMockEngineDetail(req.engineId);
        const body = toApiPredictRequest(req, eng);
        const data = await fetchJson<ApiPredictResponse>(endpoints.predict, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        return mapPredictResponse(req.engineId, data);
      },
    ),

  getAlerts: (query?: ApiAlertsQuery): Promise<AlertItem[]> =>
    withDemoMode(
      () => getMockAlerts(),
      async () => {
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
      },
    ),

  acknowledgeAlert: (alertId: string, userName?: string): Promise<AlertItem> =>
    withDemoMode(
      () => acknowledgeMockAlert(alertId, userName),
      async () => {
        await fetchJson(endpoints.acknowledgeAlert(alertId), { method: 'POST' });
        const alerts = await apiClient.getAlerts();
        const updated = alerts.find((a) => a.alertId === alertId);
        if (!updated) throw new ApiError(404, `Alert ${alertId} not found after acknowledge`);
        return { ...updated, status: 'acknowledged', acknowledgedBy: userName };
      },
    ),

  resolveAlert: (alertId: string): Promise<AlertItem> =>
    withDemoMode(
      () => resolveMockAlert(alertId),
      async () => {
        await fetchJson(endpoints.resolveAlert(alertId), { method: 'POST' });
        const alerts = await apiClient.getAlerts();
        const updated = alerts.find((a) => a.alertId === alertId);
        if (!updated) throw new ApiError(404, `Alert ${alertId} not found after resolve`);
        return { ...updated, status: 'resolved' };
      },
    ),

  getModels: (): Promise<AIModel[]> =>
    withDemoMode(
      () => getMockModels(),
      async () => {
        const data = await fetchJson<ApiModelsResponse>(endpoints.models);
        return mapModelsResponse(data);
      },
    ),

  getAdminStatus: async (): Promise<{ dataset: DatasetStatus; activeJob: PipelineJob }> => {
    await delay(180);
    return {
      dataset: getMockDatasetStatus(),
      activeJob: getMockActiveJob(),
    };
  },

  loadDataset: (): Promise<PipelineJob> =>
    withDemoMode(
      () => triggerMockPipelineJob('load_dataset'),
      async () => {
        const data = await fetchJson<ApiAdminJobResponse>(endpoints.adminLoadDataset, { method: 'POST' });
        return mapAdminJobToPipeline(data, 'load_dataset');
      },
    ),

  preprocessDataset: (): Promise<PipelineJob> =>
    withDemoMode(
      () => triggerMockPipelineJob('preprocess'),
      async () => {
        const data = await fetchJson<ApiAdminJobResponse>(endpoints.adminPreprocess, { method: 'POST' });
        return mapAdminJobToPipeline(data, 'preprocess');
      },
    ),

  trainModel: (modelType: 'baseline' | 'lstm' | 'gru'): Promise<PipelineJob> =>
    withDemoMode(
      () => triggerMockPipelineJob(modelType === 'lstm' || modelType === 'gru' ? 'train_lstm' : 'train_baseline'),
      async () => {
        const data = await fetchJson<ApiAdminJobResponse>(endpoints.adminTrain, {
          method: 'POST',
          body: JSON.stringify({ model_type: modelType }),
        });
        const action = modelType === 'lstm' || modelType === 'gru' ? 'train_lstm' : 'train_baseline';
        return mapAdminJobToPipeline(data, action);
      },
    ),
};
