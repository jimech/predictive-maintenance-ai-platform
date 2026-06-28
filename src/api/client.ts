/// <reference types="vite/client" />
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
  type AIModel,
  type AlertItem,
  type DatasetStatus,
  type EngineDetail,
  type FleetResponse,
  type PipelineJob,
  type PredictRequest,
  type PredictResponse,
  type SensorReading,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
let isDemoMode = localStorage.getItem('demoMode') !== 'false'; // Default true for reliable frontend preview

export const setDemoMode = (value: boolean) => {
  isDemoMode = value;
};

// Simulated network latency
const delay = (ms = 250) => new Promise((res) => setTimeout(res, ms));

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchOrMock<T>(
  endpoint: string,
  options: RequestInit = {},
  mockResolver: () => T | Promise<T>
): Promise<T> {
  if (!isDemoMode) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[FastAPI Client] Fetch to ${endpoint} failed, falling back to mock data:`, err);
    }
  }

  await delay(180);
  return mockResolver();
}

export const apiClient = {
  // GET /api/v1/fleet
  getFleet: (): Promise<FleetResponse> => {
    return fetchOrMock('/fleet', { method: 'GET' }, () => getMockFleet());
  },

  // GET /api/v1/engines/:engineId
  getEngine: (engineId: string): Promise<EngineDetail> => {
    return fetchOrMock(`/engines/${engineId}`, { method: 'GET' }, () => {
      const eng = getMockEngineDetail(engineId);
      if (!eng) throw new ApiError(404, `Engine ${engineId} not found`);
      return eng;
    });
  },

  // GET /api/v1/engines/:engineId/sensors
  getEngineSensors: (engineId: string): Promise<SensorReading[]> => {
    return fetchOrMock(`/engines/${engineId}/sensors`, { method: 'GET' }, () => {
      const eng = getMockEngineDetail(engineId);
      return eng ? eng.sensorHistory : [];
    });
  },

  // POST /api/v1/predict
  predictRul: (req: PredictRequest): Promise<PredictResponse> => {
    return fetchOrMock('/predict', { method: 'POST', body: JSON.stringify(req) }, () => {
      const eng = getMockEngineDetail(req.engineId);
      if (!eng) throw new ApiError(404, 'Engine not found');

      const result = runMockPredict(req.engineId, req.simulatedCyclesToAdd || 10);
      return {
        engineId: req.engineId,
        originalRul: eng.estimatedRul + (req.simulatedCyclesToAdd || 10),
        predictedRul: result.predictedRul,
        confidenceScore: Number((0.92 - (result.predictedRul < 30 ? 0.08 : 0)).toFixed(2)),
        newRiskCategory: result.riskCategory,
        aiExplanation: `DeepBiLSTM model re-evaluated degradation curves with +${req.simulatedCyclesToAdd || 10} operational cycles. LPT Temp gradient increased failure risk to ${result.riskCategory.toUpperCase()}.`,
      };
    });
  },

  // GET /api/v1/alerts
  getAlerts: (): Promise<AlertItem[]> => {
    return fetchOrMock('/alerts', { method: 'GET' }, () => getMockAlerts());
  },

  // POST /api/v1/alerts/:alertId/acknowledge
  acknowledgeAlert: (alertId: string, userName?: string): Promise<AlertItem> => {
    return fetchOrMock(`/alerts/${alertId}/acknowledge`, { method: 'POST' }, () => {
      return acknowledgeMockAlert(alertId, userName);
    });
  },

  // POST /api/v1/alerts/:alertId/resolve
  resolveAlert: (alertId: string): Promise<AlertItem> => {
    return fetchOrMock(`/alerts/${alertId}/resolve`, { method: 'POST' }, () => {
      return resolveMockAlert(alertId);
    });
  },

  // GET /api/v1/models
  getModels: (): Promise<AIModel[]> => {
    return fetchOrMock('/models', { method: 'GET' }, () => getMockModels());
  },

  // GET /api/v1/admin/status (Bonus helper for UI status)
  getAdminStatus: (): Promise<{ dataset: DatasetStatus; activeJob: PipelineJob }> => {
    return fetchOrMock('/admin/status', { method: 'GET' }, () => ({
      dataset: getMockDatasetStatus(),
      activeJob: getMockActiveJob(),
    }));
  },

  // POST /api/v1/admin/datasets/load
  loadDataset: (): Promise<PipelineJob> => {
    return fetchOrMock('/admin/datasets/load', { method: 'POST' }, () => {
      return triggerMockPipelineJob('load_dataset');
    });
  },

  // POST /api/v1/admin/preprocess
  preprocessDataset: (): Promise<PipelineJob> => {
    return fetchOrMock('/admin/preprocess', { method: 'POST' }, () => {
      return triggerMockPipelineJob('preprocess');
    });
  },

  // POST /api/v1/admin/train
  trainModel: (modelType: 'baseline' | 'lstm'): Promise<PipelineJob> => {
    return fetchOrMock('/admin/train', { method: 'POST', body: JSON.stringify({ modelType }) }, () => {
      return triggerMockPipelineJob(modelType === 'lstm' ? 'train_lstm' : 'train_baseline');
    });
  },
};
