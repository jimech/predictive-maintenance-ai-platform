import {
  type AIModel,
  type AlertItem,
  type DatasetStatus,
  type EngineDetail,
  type EngineSummary,
  type FleetResponse,
  type PipelineJob,
  type RiskCategory,
  type SensorContribution,
  type SensorReading
} from './types';

// Helper for deterministic random numbers
function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Generate 100 realistic Turbofan Engines (CMAPSS FD001 style)
export function generateMockEngines(): EngineSummary[] {
  const engines: EngineSummary[] = [];
  const fleets = ['Atlantic Fleet A', 'Pacific Ops B', 'Cargo Wing C', 'Charters Express D'];
  const models = ['GE90-115B', 'CFM56-7B', 'PW1100G', 'Trent XWB'];

  for (let i = 1; i <= 100; i++) {
    const r = pseudoRandom(i * 13.37);
    const idNum = String(i).padStart(4, '0');
    const engineId = `TF-${idNum}`;
    const fleetGroup = fleets[i % fleets.length];
    const modelType = models[i % models.length];

    // Distribute cycles: some young (20-80), some mature (80-180), some aged (180-320)
    const latestCycle = Math.floor(20 + r * 280);

    // Calculate RUL based on standard turbofan failure threshold (~300 max cycles)
    // Add noise
    const baseLife = 310;
    const remaining = Math.max(2, Math.floor(baseLife - latestCycle + (pseudoRandom(i * 7) * 40 - 20)));

    let riskCategory: RiskCategory = 'healthy';
    let failureProb = 0.05;
    let healthScore = 95;

    if (remaining <= 20) {
      riskCategory = 'critical';
      failureProb = Number((0.78 + pseudoRandom(i * 3) * 0.2).toFixed(2));
      healthScore = Math.floor(10 + pseudoRandom(i * 2) * 18);
    } else if (remaining <= 55) {
      riskCategory = 'warning';
      failureProb = Number((0.40 + pseudoRandom(i * 3) * 0.35).toFixed(2));
      healthScore = Math.floor(35 + pseudoRandom(i * 2) * 25);
    } else if (remaining <= 100) {
      riskCategory = 'watch';
      failureProb = Number((0.18 + pseudoRandom(i * 3) * 0.20).toFixed(2));
      healthScore = Math.floor(65 + pseudoRandom(i * 2) * 15);
    } else {
      riskCategory = 'healthy';
      failureProb = Number((0.02 + pseudoRandom(i * 3) * 0.12).toFixed(2));
      healthScore = Math.floor(82 + pseudoRandom(i * 2) * 17);
    }

    const alertsCount = riskCategory === 'critical' ? Math.floor(2 + pseudoRandom(i) * 3) :
                        riskCategory === 'warning' ? Math.floor(1 + pseudoRandom(i) * 2) :
                        riskCategory === 'watch' && pseudoRandom(i) > 0.6 ? 1 : 0;

    const daysAgo = Math.floor(pseudoRandom(i * 99) * 45);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    engines.push({
      engineId,
      fleetGroup,
      modelType,
      latestCycle,
      estimatedRul: remaining,
      healthScore,
      failureProbability: failureProb,
      riskCategory,
      openAlertsCount: alertsCount,
      lastInspectionDate: date.toISOString().split('T')[0],
    });
  }

  return engines;
}

// In-memory persistent database for the frontend session
let mockEnginesCache: EngineSummary[] = generateMockEngines();

// Generate Alerts based on engines
export function generateMockAlerts(engines: EngineSummary[]): AlertItem[] {
  const alerts: AlertItem[] = [];
  let alertCounter = 1000;

  engines.forEach((eng) => {
    if (eng.openAlertsCount > 0) {
      const isCrit = eng.riskCategory === 'critical';
      const count = eng.openAlertsCount;

      for (let j = 0; j < count; j++) {
        alertCounter++;
        const sev = isCrit && j === 0 ? 'critical' : eng.riskCategory === 'warning' ? 'warning' : 'info';
        const sensor = j === 0 ? 'T50 (LPT Temp)' : j === 1 ? 'NF (Fan Speed)' : 'HT3 (Enthalpy)';
        const val = j === 0 ? 1432.8 : j === 1 ? 2388.2 : 44.9;
        const thresh = j === 0 ? 1410.0 : j === 1 ? 2380.0 : 42.0;

        alerts.push({
          alertId: `ALT-${alertCounter}`,
          engineId: eng.engineId,
          severity: sev,
          status: 'open',
          title: `${sev.toUpperCase()}: Abnormal ${sensor.split(' ')[0]} signature on ${eng.engineId}`,
          description: `AI anomaly detection model recorded elevated ${sensor} reading (${val}) exceeding upper safety limit (${thresh}). Remaining useful life estimated at ${eng.estimatedRul} cycles.`,
          sensorTriggered: sensor.split(' ')[0],
          currentValue: val,
          thresholdValue: thresh,
          unit: j === 0 ? '°R' : j === 1 ? 'rpm' : 'BTU/lbm',
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 3)).toISOString(),
        });
      }
    }
  });

  // Add a few historical acknowledged / resolved alerts
  alerts.push({
    alertId: 'ALT-0998',
    engineId: 'TF-0012',
    severity: 'warning',
    status: 'acknowledged',
    title: 'WARNING: P30 Pressure Fluctuation',
    description: 'Compressor discharge pressure showed transient drop during high-thrust cycle climb phase.',
    sensorTriggered: 'P30',
    currentValue: 542.1,
    thresholdValue: 550.0,
    unit: 'psia',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    acknowledgedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    acknowledgedBy: 'Erik Nordmann (Ops)',
  });

  alerts.push({
    alertId: 'ALT-0995',
    engineId: 'TF-0045',
    severity: 'critical',
    status: 'resolved',
    title: 'CRITICAL: Severe Vibration / Fan Imbalance',
    description: 'Borescope inspection completed following high NF vibration spike. Fan blade tip clearance restored.',
    sensorTriggered: 'NF',
    currentValue: 2394.5,
    thresholdValue: 2385.0,
    unit: 'rpm',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    acknowledgedAt: new Date(Date.now() - 86400000 * 11).toISOString(),
    acknowledgedBy: 'Erik Nordmann (Ops)',
    resolvedAt: new Date(Date.now() - 86400000 * 9).toISOString(),
  });

  return alerts;
}

let mockAlertsCache: AlertItem[] = generateMockAlerts(mockEnginesCache);

// Mock AI Models
let mockModelsCache: AIModel[] = [
  {
    modelId: 'MOD-LSTM-v4.2',
    name: 'DeepBiLSTM Attentional Turbofan RUL Estimator',
    architecture: 'LSTM Neural Net',
    version: 'v4.2.0-prod',
    mae: 11.42,
    rmse: 14.89,
    nasaScore: 324.5,
    isProduction: true,
    trainingDataset: 'CMAPSS FD001 + FD003 Augmented (10,400 trajectories)',
    trainedAt: '2026-06-15T08:30:00Z',
    inferenceTimeMs: 18,
    accuracyTrend: [88.2, 89.4, 91.1, 92.8, 94.1, 94.6],
  },
  {
    modelId: 'MOD-TCN-v2.1',
    name: 'Dilated Temporal Convolutional Net (TCN-Aero)',
    architecture: 'Temporal ConvNet (TCN)',
    version: 'v2.1.0-stage',
    mae: 10.15,
    rmse: 13.22,
    nasaScore: 285.1,
    isProduction: false,
    trainingDataset: 'CMAPSS FD001 + FD004 Multi-Condition',
    trainedAt: '2026-06-25T14:12:00Z',
    inferenceTimeMs: 12,
    accuracyTrend: [89.0, 91.2, 93.0, 94.5, 95.8],
  },
  {
    modelId: 'MOD-XFRM-v1.0',
    name: 'Aeroformer-12M Sensor Sequence Transformer',
    architecture: 'Transformer Attention',
    version: 'v1.0.4-exp',
    mae: 9.84,
    rmse: 12.45,
    nasaScore: 242.8,
    isProduction: false,
    trainingDataset: 'CMAPSS Complete Fleet DB (45,000 engine cycles)',
    trainedAt: '2026-06-27T19:45:00Z',
    inferenceTimeMs: 34,
    accuracyTrend: [91.5, 93.8, 95.2, 96.4],
  },
  {
    modelId: 'MOD-GBDT-v3.0',
    name: 'XGBoost Fleet Baseline Regressor',
    architecture: 'Gradient Boosting',
    version: 'v3.0.1',
    mae: 16.54,
    rmse: 21.08,
    nasaScore: 612.0,
    isProduction: false,
    trainingDataset: 'CMAPSS FD001 Classic',
    trainedAt: '2026-04-10T11:00:00Z',
    inferenceTimeMs: 4,
    accuracyTrend: [82.1, 84.0, 85.1, 85.4],
  },
  {
    modelId: 'MOD-RF-BASE',
    name: 'Legacy Random Forest Benchmark',
    architecture: 'Random Forest',
    version: 'v1.8',
    mae: 22.31,
    rmse: 28.90,
    nasaScore: 1140.2,
    isProduction: false,
    trainingDataset: 'CMAPSS FD001 Subsample',
    trainedAt: '2025-11-01T09:00:00Z',
    inferenceTimeMs: 8,
    accuracyTrend: [74.5, 76.2, 77.0],
  },
];

// Pipeline Dataset Status
let mockDatasetStatus: DatasetStatus = {
  datasetId: 'CMAPSS-FD001-PROD',
  name: 'NASA CMAPSS Turbofan Engine Degradation Simulation (FD001)',
  description: 'Sea level standard operating conditions. Single fault mode (HPC degradation). 100 training engines, 100 testing engines.',
  totalEngines: 100,
  totalSensorRecords: 20631,
  isLoaded: true,
  isPreprocessed: true,
  lastUpdated: '2026-06-28T04:00:00Z',
};

// Pipeline Active Job State
let activePipelineJob: PipelineJob = {
  jobId: 'JOB-IDLE-0',
  action: 'load_dataset',
  status: 'idle',
  progress: 0,
  logs: ['System ready. Select a pipeline operation above to execute on FastAPI backend workers.'],
};

// --- DATA ACCESS & MUTATION FUNCTIONS (Mocking FastAPI API endpoints) ---

export function getMockFleet(): FleetResponse {
  const engines = [...mockEnginesCache];
  const critical = engines.filter(e => e.riskCategory === 'critical').length;
  const warning = engines.filter(e => e.riskCategory === 'warning').length;
  const watch = engines.filter(e => e.riskCategory === 'watch').length;
  const healthy = engines.filter(e => e.riskCategory === 'healthy').length;

  const totalRul = engines.reduce((acc, e) => acc + e.estimatedRul, 0);
  const avgRul = Math.round(totalRul / (engines.length || 1));

  const openAlerts = mockAlertsCache.filter(a => a.status === 'open').length;

  return {
    kpis: {
      totalEngines: engines.length,
      criticalEngines: critical,
      warningEngines: warning,
      watchEngines: watch,
      healthyEngines: healthy,
      averageRul: avgRul,
      openAlerts,
    },
    distribution: { healthy, watch, warning, critical },
    engines,
  };
}

// Generate realistic 150-cycle sensor time-series for a specific engine
export function generateSensorHistory(engine: EngineSummary): SensorReading[] {
  const history: SensorReading[] = [];
  const seedNum = parseInt(engine.engineId.replace('TF-', ''), 10) || 1;
  const totalCycles = engine.latestCycle;
  const startCycle = Math.max(1, totalCycles - 80); // Show last 80 cycles

  for (let c = startCycle; c <= totalCycles; c++) {
    // Degradation factor (0 at start of life, ~1 at failure)
    const wear = Math.pow((c / 310), 2.5);

    history.push({
      cycle: c,
      T24: Number((1198.5 + wear * 12 + pseudoRandom(seedNum * c + 1) * 3 - 1.5).toFixed(1)),
      T30: Number((1580.2 + wear * 24 + pseudoRandom(seedNum * c + 2) * 5 - 2.5).toFixed(1)),
      T50: Number((1395.0 + wear * 38 + pseudoRandom(seedNum * c + 3) * 6 - 3).toFixed(1)),
      P30: Number((553.5 - wear * 14 + pseudoRandom(seedNum * c + 4) * 2 - 1).toFixed(2)),
      NF:  Number((2388.0 + wear * 6.5 + pseudoRandom(seedNum * c + 5) * 1.2 - 0.6).toFixed(1)),
      NC:  Number((9045.0 + wear * 18 + pseudoRandom(seedNum * c + 6) * 8 - 4).toFixed(1)),
      BPR: Number((8.40 + wear * 0.12 + pseudoRandom(seedNum * c + 7) * 0.04 - 0.02).toFixed(3)),
      HT3: Number((38.8 + wear * 4.2 + pseudoRandom(seedNum * c + 8) * 0.6 - 0.3).toFixed(2)),
      W31: Number((39.1 - wear * 2.8 + pseudoRandom(seedNum * c + 9) * 0.5 - 0.25).toFixed(2)),
    });
  }

  return history;
}

export function getMockEngineDetail(engineId: string): EngineDetail | null {
  const summary = mockEnginesCache.find(e => e.engineId === engineId);
  if (!summary) return null;

  const history = generateSensorHistory(summary);
  const latestSensor = history[history.length - 1] || {
    cycle: summary.latestCycle,
    T24: 1205.2, T30: 1598.1, T50: 1422.4, P30: 542.8, NF: 2391.2, NC: 9061.4, BPR: 8.51, HT3: 42.1, W31: 37.2
  };

  const isCrit = summary.riskCategory === 'critical';
  const isWarn = summary.riskCategory === 'warning';

  const confMargin = Math.max(3, Math.floor(summary.estimatedRul * 0.12));

  const topContributors: SensorContribution[] = [
    {
      sensorKey: 'T50',
      label: 'LPT Outlet Temp (T50)',
      unit: '°R',
      contributionScore: isCrit ? 34.2 : isWarn ? 28.5 : 22.1,
      currentValue: latestSensor.T50,
      normalRange: [1390, 1412],
      status: latestSensor.T50 > 1420 ? 'critical' : latestSensor.T50 > 1412 ? 'elevated' : 'normal',
    },
    {
      sensorKey: 'P30',
      label: 'HPC Outlet Press (P30)',
      unit: 'psia',
      contributionScore: 21.8,
      currentValue: latestSensor.P30,
      normalRange: [550, 556],
      status: latestSensor.P30 < 545 ? 'critical' : latestSensor.P30 < 550 ? 'elevated' : 'normal',
    },
    {
      sensorKey: 'NF',
      label: 'Physical Fan Speed (NF)',
      unit: 'rpm',
      contributionScore: 16.5,
      currentValue: latestSensor.NF,
      normalRange: [2387, 2389],
      status: latestSensor.NF > 2390 ? 'elevated' : 'normal',
    },
    {
      sensorKey: 'HT3',
      label: 'Bleed Enthalpy (HT3)',
      unit: 'BTU',
      contributionScore: 14.1,
      currentValue: latestSensor.HT3,
      normalRange: [38.5, 40.5],
      status: latestSensor.HT3 > 41.5 ? 'elevated' : 'normal',
    },
    {
      sensorKey: 'W31',
      label: 'HPT Coolant Bleed (W31)',
      unit: 'lbm/s',
      contributionScore: 13.4,
      currentValue: latestSensor.W31,
      normalRange: [38.5, 39.5],
      status: latestSensor.W31 < 37.8 ? 'elevated' : 'normal',
    },
  ];

  const recommendations = isCrit ? [
    {
      priority: 'high' as const,
      action: 'Immediate Borescope & HPC Stage 3 Replacement',
      description: 'AI thermal signature model indicates severe HPC gas path seal erosion. Schedule hangar induction within 48 operational hours to prevent unscheduled in-flight shutdown.',
      estimatedDowntimeHours: 36,
    },
    {
      priority: 'medium' as const,
      action: 'Fuel Nozzle Spray Pattern Calibration',
      description: 'Elevated T50 variance across circumferential thermocouples indicates localized combustor hot spotting.',
      estimatedDowntimeHours: 8,
    }
  ] : isWarn ? [
    {
      priority: 'high' as const,
      action: 'Schedule Line Water Wash & Oil Filter Analysis',
      description: 'Compressor efficiency drop detected. Perform engine hot water wash during next overnight maintenance turnaround.',
      estimatedDowntimeHours: 4,
    },
    {
      priority: 'low' as const,
      action: 'Monitor Vibration Trend on NF Bearing 1',
      description: 'Slight upward harmonic creep recorded. Continue automated AI telemetric tracking.',
      estimatedDowntimeHours: 0,
    }
  ] : [
    {
      priority: 'low' as const,
      action: 'Routine On-Wing Telemetry Verification',
      description: 'Engine operating well within nominal OEM acoustic and thermodynamic limits. Next scheduled C-check at cycle 350.',
      estimatedDowntimeHours: 0,
    }
  ];

  return {
    ...summary,
    confidenceInterval: {
      lower: Math.max(1, summary.estimatedRul - confMargin),
      upper: summary.estimatedRul + confMargin,
    },
    recommendations,
    topContributors,
    sensorHistory: history,
  };
}

export function getMockAlerts(): AlertItem[] {
  return [...mockAlertsCache];
}

export function acknowledgeMockAlert(alertId: string, userName = 'Operator (Current UI User)'): AlertItem {
  const alert = mockAlertsCache.find(a => a.alertId === alertId);
  if (alert && alert.status === 'open') {
    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = userName;
  }
  return alert || mockAlertsCache[0];
}

export function resolveMockAlert(alertId: string): AlertItem {
  const alert = mockAlertsCache.find(a => a.alertId === alertId);
  if (alert) {
    const wasOpen = alert.status === 'open';
    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();

    // Decrement engine alert count
    const eng = mockEnginesCache.find(e => e.engineId === alert.engineId);
    if (eng && eng.openAlertsCount > 0 && wasOpen) {
      eng.openAlertsCount--;
    }
  }
  return alert || mockAlertsCache[0];
}

export function getMockModels(): AIModel[] {
  return [...mockModelsCache];
}

export function getMockDatasetStatus(): DatasetStatus {
  return { ...mockDatasetStatus };
}

export function getMockActiveJob(): PipelineJob {
  return { ...activePipelineJob };
}

// Simulate running an asynchronous admin pipeline job
export function triggerMockPipelineJob(action: 'load_dataset' | 'preprocess' | 'train_baseline' | 'train_lstm'): PipelineJob {
  const jobId = `JOB-${action.toUpperCase()}-${Date.now().toString().slice(-4)}`;
  
  activePipelineJob = {
    jobId,
    action,
    status: 'running',
    progress: 15,
    logs: [`[${new Date().toLocaleTimeString()}] Initiated FastAPI async celery task for ${action}...`],
    startTime: new Date().toISOString(),
  };

  // Simulate progress in background
  const timer = setInterval(() => {
    if (activePipelineJob.jobId !== jobId) {
      clearInterval(timer);
      return;
    }

    activePipelineJob.progress = Math.min(95, activePipelineJob.progress + Math.floor(Math.random() * 25 + 15));
    
    if (action === 'load_dataset') {
      activePipelineJob.logs.push(`[${new Date().toLocaleTimeString()}] Fetching CMAPSS raw sensor files (FD001/FD003)... (${activePipelineJob.progress}%)`);
    } else if (action === 'preprocess') {
      activePipelineJob.logs.push(`[${new Date().toLocaleTimeString()}] Normalizing min-max scaler & removing constant variance sensors... (${activePipelineJob.progress}%)`);
    } else {
      activePipelineJob.logs.push(`[${new Date().toLocaleTimeString()}] Epoch ${Math.floor(activePipelineJob.progress / 10)}/10 - Loss: ${(0.45 - activePipelineJob.progress * 0.003).toFixed(4)}...`);
    }

    if (activePipelineJob.progress >= 95) {
      activePipelineJob.progress = 100;
      activePipelineJob.status = 'completed';
      activePipelineJob.endTime = new Date().toISOString();
      activePipelineJob.logs.push(`[${new Date().toLocaleTimeString()}] ✔ Job completed successfully. AI model registry updated.`);
      
      if (action === 'preprocess') {
        mockDatasetStatus.isPreprocessed = true;
        mockDatasetStatus.lastUpdated = new Date().toISOString();
      }
      clearInterval(timer);
    }
  }, 900);

  return activePipelineJob;
}

export function runMockPredict(engineId: string, cyclesToAdd = 10): { predictedRul: number; healthScore: number; riskCategory: RiskCategory } {
  const eng = mockEnginesCache.find(e => e.engineId === engineId);
  if (!eng) return { predictedRul: 100, healthScore: 80, riskCategory: 'healthy' };

  eng.latestCycle += cyclesToAdd;
  eng.estimatedRul = Math.max(1, eng.estimatedRul - cyclesToAdd);

  if (eng.estimatedRul <= 20) {
    eng.riskCategory = 'critical';
    eng.healthScore = Math.max(5, eng.healthScore - 15);
    eng.failureProbability = Math.min(0.98, Number((eng.failureProbability + 0.15).toFixed(2)));
  } else if (eng.estimatedRul <= 55) {
    eng.riskCategory = 'warning';
    eng.healthScore = Math.max(30, eng.healthScore - 10);
  }

  return {
    predictedRul: eng.estimatedRul,
    healthScore: eng.healthScore,
    riskCategory: eng.riskCategory,
  };
}
