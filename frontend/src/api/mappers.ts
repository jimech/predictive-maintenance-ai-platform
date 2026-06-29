/**
 * Maps API contract payloads (snake_case) to frontend view models (camelCase).
 */

import type {
  ApiAlert,
  ApiAlertsResponse,
  ApiEngineDetailResponse,
  ApiFleetEngine,
  ApiFleetResponse,
  ApiModel,
  ApiModelsResponse,
  ApiPredictResponse,
  ApiSensorHistoryResponse,
} from './contract';
import type {
  AIModel,
  AlertItem,
  EngineDetail,
  EngineSummary,
  FleetKPIs,
  FleetResponse,
  PredictResponse,
  RiskCategory,
  RiskDistribution,
  SensorReading,
} from './types';

const SENSOR_UI_KEYS: (keyof Omit<SensorReading, 'cycle'>)[] = [
  'T24',
  'T30',
  'T50',
  'P30',
  'NF',
  'NC',
  'BPR',
  'HT3',
  'W31',
];

/** Contract health_score is 0–1; UI displays 0–100. */
function toUiHealthScore(score: number): number {
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

function toRiskDistribution(engines: EngineSummary[]): RiskDistribution {
  return {
    healthy: engines.filter((e) => e.riskCategory === 'healthy').length,
    watch: engines.filter((e) => e.riskCategory === 'watch').length,
    warning: engines.filter((e) => e.riskCategory === 'warning').length,
    critical: engines.filter((e) => e.riskCategory === 'critical').length,
  };
}

function toFleetKpis(engines: EngineSummary[], openAlerts: number): FleetKPIs {
  const distribution = toRiskDistribution(engines);
  const averageRul =
    engines.length === 0
      ? 0
      : Math.round(engines.reduce((sum, e) => sum + e.estimatedRul, 0) / engines.length);

  return {
    totalEngines: engines.length,
    criticalEngines: distribution.critical,
    warningEngines: distribution.warning,
    watchEngines: distribution.watch,
    healthyEngines: distribution.healthy,
    averageRul,
    openAlerts,
  };
}

export function mapFleetEngine(engine: ApiFleetEngine): EngineSummary {
  return {
    engineId: engine.engine_id,
    fleetGroup: 'C-MAPSS FD001',
    modelType: 'Turbofan',
    latestCycle: engine.latest_cycle,
    estimatedRul: engine.estimated_rul,
    healthScore: toUiHealthScore(engine.health_score),
    failureProbability: engine.failure_probability,
    riskCategory: engine.risk_category,
    openAlertsCount: engine.open_alerts,
    lastInspectionDate: new Date().toISOString().split('T')[0],
  };
}

export function mapFleetResponse(response: ApiFleetResponse): FleetResponse {
  const engines = response.engines.map(mapFleetEngine);
  const openAlerts = engines.reduce((sum, e) => sum + e.openAlertsCount, 0);

  return {
    engines,
    kpis: toFleetKpis(engines, openAlerts),
    distribution: toRiskDistribution(engines),
  };
}

export function mapEngineDetail(
  response: ApiEngineDetailResponse,
  sensorHistory: SensorReading[] = [],
): EngineDetail {
  const summary = mapFleetEngine({
    engine_id: response.engine_id,
    external_engine_id: response.external_engine_id,
    latest_cycle: response.latest_cycle,
    estimated_rul: response.latest_prediction.estimated_rul,
    lower_ci: response.latest_prediction.lower_ci,
    upper_ci: response.latest_prediction.upper_ci,
    health_score: response.latest_prediction.health_score,
    failure_probability: response.latest_prediction.failure_probability,
    risk_category: response.latest_prediction.risk_category,
    open_alerts: response.open_alerts,
  });

  const isCrit = summary.riskCategory === 'critical';
  const isWarn = summary.riskCategory === 'warning';

  return {
    ...summary,
    confidenceInterval: {
      lower: response.latest_prediction.lower_ci,
      upper: response.latest_prediction.upper_ci,
    },
    recommendations: [
      {
        priority: isCrit ? 'high' : isWarn ? 'medium' : 'low',
        action: isCrit ? 'Schedule immediate maintenance' : 'Continue monitoring',
        description: response.recommendation,
        estimatedDowntimeHours: isCrit ? 24 : 0,
      },
    ],
    topContributors: [],
    sensorHistory,
  };
}

export function mapSensorHistory(response: ApiSensorHistoryResponse): SensorReading[] {
  const seriesKeys = Object.keys(response.series);
  if (response.cycles.length === 0) return [];

  return response.cycles.map((cycle, index) => {
    const reading: SensorReading = {
      cycle,
      T24: 0,
      T30: 0,
      T50: 0,
      P30: 0,
      NF: 0,
      NC: 0,
      BPR: 0,
      HT3: 0,
      W31: 0,
    };

    SENSOR_UI_KEYS.forEach((uiKey, sensorIndex) => {
      const apiKey = seriesKeys[sensorIndex] ?? `sensor_${sensorIndex + 1}`;
      const values = response.series[apiKey];
      if (values?.[index] !== undefined) {
        reading[uiKey] = values[index];
      }
    });

    return reading;
  });
}

export function mapAlert(alert: ApiAlert): AlertItem {
  return {
    alertId: alert.id,
    engineId: alert.engine_id,
    severity: alert.severity,
    status: alert.status,
    title: alert.title,
    description: alert.message,
    createdAt: alert.created_at,
  };
}

export function mapAlertsResponse(response: ApiAlertsResponse): AlertItem[] {
  return response.alerts.map(mapAlert);
}

export function mapModel(model: ApiModel): AIModel {
  const architectureMap: Record<string, AIModel['architecture']> = {
    baseline: 'Random Forest',
    lstm: 'LSTM Neural Net',
    gru: 'LSTM Neural Net',
  };

  return {
    modelId: model.id,
    name: model.model_name,
    architecture: architectureMap[model.model_type] ?? 'Gradient Boosting',
    version: model.model_name,
    mae: model.mae,
    rmse: model.rmse,
    nasaScore: model.nasa_score ?? 0,
    isProduction: model.is_production,
    trainingDataset: model.dataset_name,
    trainedAt: model.created_at,
    inferenceTimeMs: 0,
    accuracyTrend: [],
  };
}

export function mapModelsResponse(response: ApiModelsResponse): AIModel[] {
  return response.models.map(mapModel);
}

export function mapPredictResponse(engineId: string, response: ApiPredictResponse): PredictResponse {
  return {
    engineId,
    originalRul: response.estimated_rul,
    predictedRul: response.estimated_rul,
    confidenceScore: Number((1 - (response.upper_ci - response.lower_ci) / Math.max(response.estimated_rul, 1)).toFixed(2)),
    newRiskCategory: response.risk_category as RiskCategory,
    aiExplanation: response.recommendation,
  };
}
