export type RiskCategory = 'healthy' | 'watch' | 'warning' | 'critical';

export interface EngineSummary {
  engineId: string;
  fleetGroup: string;
  modelType: string;
  latestCycle: number;
  estimatedRul: number; // Remaining Useful Life in cycles
  healthScore: number; // 0 to 100%
  failureProbability: number; // 0.00 to 1.00
  riskCategory: RiskCategory;
  openAlertsCount: number;
  lastInspectionDate: string;
}

export interface RiskDistribution {
  healthy: number;
  watch: number;
  warning: number;
  critical: number;
}

export interface FleetKPIs {
  totalEngines: number;
  criticalEngines: number;
  warningEngines: number;
  watchEngines: number;
  healthyEngines: number;
  averageRul: number;
  openAlerts: number;
}

export interface FleetResponse {
  kpis: FleetKPIs;
  distribution: RiskDistribution;
  engines: EngineSummary[];
}

export interface SensorReading {
  cycle: number;
  T24: number; // Total temperature at LPC outlet (°R)
  T30: number; // Total temperature at HPC outlet (°R)
  T50: number; // Total temperature at LPT outlet (°R)
  P30: number; // Total pressure at HPC outlet (psia)
  NF: number; // Physical fan speed (rpm)
  NC: number; // Physical core speed (rpm)
  BPR: number; // Bypass Ratio
  HT3: number; // Bleed Enthalpy
  W31: number; // HPT coolant bleed (lbm/s)
}

export interface SensorContribution {
  sensorKey: keyof Omit<SensorReading, 'cycle'>;
  label: string;
  unit: string;
  contributionScore: number; // Percentage 0-100
  currentValue: number;
  normalRange: [number, number];
  status: 'normal' | 'elevated' | 'critical';
}

export interface EngineDetail extends EngineSummary {
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
    estimatedDowntimeHours: number;
  }[];
  topContributors: SensorContribution[];
  sensorHistory: SensorReading[];
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface AlertItem {
  alertId: string;
  engineId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  sensorTriggered?: string;
  currentValue?: number;
  thresholdValue?: number;
  unit?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
}

export interface AIModel {
  modelId: string;
  name: string;
  architecture: 'Random Forest' | 'Gradient Boosting' | 'LSTM Neural Net' | 'Temporal ConvNet (TCN)' | 'Transformer Attention';
  version: string;
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Square Error
  nasaScore: number; // NASA Asymmetric Scoring Function
  isProduction: boolean;
  trainingDataset: string;
  trainedAt: string;
  inferenceTimeMs: number;
  accuracyTrend: number[];
}

export interface DatasetStatus {
  datasetId: string;
  name: string;
  description: string;
  totalEngines: number;
  totalSensorRecords: number;
  isLoaded: boolean;
  isPreprocessed: boolean;
  lastUpdated: string;
}

export interface PipelineJob {
  jobId: string;
  action: 'load_dataset' | 'preprocess' | 'train_baseline' | 'train_lstm';
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number; // 0 - 100
  logs: string[];
  startTime?: string;
  endTime?: string;
  resultSummary?: string;
}

export interface PredictRequest {
  engineId: string;
  simulatedCyclesToAdd?: number;
  overrideSensors?: Partial<Record<string, number>>;
}

export interface PredictResponse {
  engineId: string;
  originalRul: number;
  predictedRul: number;
  confidenceScore: number;
  newRiskCategory: RiskCategory;
  aiExplanation: string;
}
