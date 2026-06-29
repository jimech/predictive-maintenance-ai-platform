/**
 * Types aligned with docs/API_CONTRACT.md (backend wire format, snake_case).
 * UI components use view models from ./types.ts; see ./mappers.ts for conversion.
 */

export type ApiRiskCategory = 'healthy' | 'watch' | 'warning' | 'critical';
export type ApiAlertSeverity = 'info' | 'warning' | 'critical';
export type ApiAlertStatus = 'open' | 'acknowledged' | 'resolved';
export type ApiModelType = 'baseline' | 'lstm' | 'gru';

export interface ApiHealthResponse {
  status: 'ok';
}

export interface ApiReadyResponse {
  status: 'ready';
  database: string;
  model: string;
}

export interface ApiFleetEngine {
  engine_id: string;
  external_engine_id: number;
  latest_cycle: number;
  estimated_rul: number;
  lower_ci: number;
  upper_ci: number;
  health_score: number;
  failure_probability: number;
  risk_category: ApiRiskCategory;
  open_alerts: number;
}

export interface ApiFleetResponse {
  engines: ApiFleetEngine[];
}

export interface ApiPredictionSummary {
  estimated_rul: number;
  lower_ci: number;
  upper_ci: number;
  health_score: number;
  failure_probability: number;
  risk_category: ApiRiskCategory;
}

export interface ApiEngineDetailResponse {
  engine_id: string;
  external_engine_id: number;
  status: string;
  latest_cycle: number;
  latest_prediction: ApiPredictionSummary;
  recommendation: string;
  open_alerts: number;
}

export interface ApiSensorHistoryResponse {
  engine_id: string;
  cycles: number[];
  series: Record<string, number[]>;
}

export interface ApiTopContributingSensor {
  sensor: string;
  importance: number;
}

export interface ApiPredictRequest {
  engine_id: string;
  cycle: number;
  operational_settings: number[];
  sensor_readings: Record<string, number>;
}

export interface ApiPredictResponse {
  estimated_rul: number;
  lower_ci: number;
  upper_ci: number;
  health_score: number;
  failure_probability: number;
  risk_category: ApiRiskCategory;
  top_contributing_sensors: ApiTopContributingSensor[];
  recommendation: string;
}

export interface ApiAlert {
  id: string;
  engine_id: string;
  external_engine_id: number;
  severity: ApiAlertSeverity;
  title: string;
  message: string;
  status: ApiAlertStatus;
  created_at: string;
}

export interface ApiAlertsResponse {
  alerts: ApiAlert[];
}

export interface ApiAlertActionResponse {
  status: 'acknowledged' | 'resolved';
}

export interface ApiModel {
  id: string;
  model_name: string;
  model_type: string;
  dataset_name: string;
  mae: number;
  rmse: number;
  nasa_score: number | null;
  is_production: boolean;
  created_at: string;
}

export interface ApiModelsResponse {
  models: ApiModel[];
}

export interface ApiAdminJobResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface ApiTrainRequest {
  model_type: ApiModelType;
}

export interface ApiAlertsQuery {
  severity?: ApiAlertSeverity;
  status?: ApiAlertStatus;
  engine_id?: string;
}

export interface ApiSensorsQuery {
  from_cycle?: number;
  to_cycle?: number;
}
