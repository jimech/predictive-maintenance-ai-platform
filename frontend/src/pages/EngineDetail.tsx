import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Target, AlertTriangle, ShieldCheck, Zap, Thermometer, Gauge, Wind } from 'lucide-react';
import { useEngine, useEngineSensors, usePredictRul } from '../hooks/useEngine';
import { useAlerts } from '../hooks/useAlerts';
import { PlotlyChart } from '../components/PlotlyChart';
import { RiskBadge } from '../components/RiskBadge';
import { formatEngineLabel } from '../lib/utils';

export const EngineDetail: React.FC = () => {
  const { engineId } = useParams<{ engineId: string }>();
  const navigate = useNavigate();
  
  const { data: engine, isLoading: isEngineLoading, error: engineError, refetch } = useEngine(engineId || '');
  const { data: sensors, isLoading: isSensorsLoading } = useEngineSensors(engineId || '');
  const { data: allAlerts } = useAlerts();
  
  const predictMutation = usePredictRul();

  const handleSimulate = () => {
    if (engineId) {
      predictMutation.mutate({ engineId, simulatedCyclesToAdd: 15 });
    }
  };

  const engineAlerts = useMemo(() => {
    if (!allAlerts || !engineId) return [];
    return allAlerts.filter(a => a.engineId === engineId);
  }, [allAlerts, engineId]);

  const multiSensorData = useMemo(() => {
    if (!sensors || sensors.length === 0) return [];
    
    return [
      {
        x: sensors.map(s => s.cycle),
        y: sensors.map(s => s.T50),
        name: 'T50 (LPT Temp)',
        type: 'scatter' as const,
        mode: 'lines' as const,
        line: { color: '#ef4444', width: 2 },
      },
      {
        x: sensors.map(s => s.cycle),
        y: sensors.map(s => s.NF),
        name: 'NF (Fan Speed)',
        type: 'scatter' as const,
        mode: 'lines' as const,
        yaxis: 'y2',
        line: { color: '#3b82f6', width: 2 },
      },
      {
        x: sensors.map(s => s.cycle),
        y: sensors.map(s => s.P30),
        name: 'P30 (HPC Press)',
        type: 'scatter' as const,
        mode: 'lines' as const,
        yaxis: 'y3',
        line: { color: '#10b981', width: 2 },
      }
    ];
  }, [sensors]);

  const topContributorsData = useMemo(() => {
    if (!engine?.topContributors) return [];
    const sorted = [...engine.topContributors].sort((a, b) => a.contributionScore - b.contributionScore);
    
    return [{
      type: 'bar' as const,
      x: sorted.map(c => c.contributionScore),
      y: sorted.map(c => c.sensorKey),
      orientation: 'h' as const,
      marker: {
        color: sorted.map(c => c.status === 'critical' ? '#ef4444' : c.status === 'elevated' ? '#f59e0b' : '#3b82f6')
      }
    }];
  }, [engine?.topContributors]);

  if (isEngineLoading) {
    return <div className="p-8 text-center text-slate-500 font-mono">Loading engine telemetry...</div>;
  }

  if (engineError || !engine) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
        <p className="font-mono font-bold mb-2">Failed to load engine data.</p>
        <p className="text-xs font-mono mb-4">{engineError?.message || 'Engine not found'}</p>
        <button onClick={() => refetch()} className="px-3 py-1 bg-rose-500 text-white rounded text-xs font-bold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-3">
              {formatEngineLabel(engine.engineId, engine.externalEngineId)}
              <RiskBadge category={engine.riskCategory} size="lg" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
              {engine.modelType} | {engine.fleetGroup} | Latest: {engine.latestCycle} cyc
              {engine.externalEngineId != null && ` | ID: ${engine.engineId}`}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSimulate}
          disabled={predictMutation.isPending}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold font-mono shadow-md shadow-indigo-600/20 flex items-center gap-2"
        >
          <Target className="w-4 h-4" />
          {predictMutation.isPending ? 'Simulating...' : 'Simulate +15 Cycles'}
        </button>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* RUL Card */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Estimated Remaining Useful Life</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-black font-mono ${engine.estimatedRul <= 20 ? 'text-rose-500' : engine.estimatedRul <= 55 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {engine.estimatedRul}
            </span>
            <span className="text-sm font-bold text-slate-400 uppercase">Cycles</span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 flex justify-between">
            <span>Confidence Interval (95%)</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">[{engine.confidenceInterval.lower} - {engine.confidenceInterval.upper}]</span>
          </div>
        </div>

        {/* Health Score Gauge (Simplified with CSS) */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 w-full mb-4">Overall Health Score</h3>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200 dark:text-slate-800" />
              <circle 
                cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                strokeDasharray={`${251.2 * (engine.healthScore / 100)} 251.2`}
                className={engine.healthScore < 30 ? 'text-rose-500' : engine.healthScore < 60 ? 'text-amber-500' : 'text-emerald-500'}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{engine.healthScore}%</span>
            </div>
          </div>
        </div>

        {/* Failure Probability */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Failure Probability</h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-black font-mono ${engine.failureProbability > 0.5 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
              {(engine.failureProbability * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-xs mt-3 text-slate-500">Probability of critical failure within the next 20 operational cycles based on LSTM sequence prediction.</p>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-sensor Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm min-h-[400px] flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-200 font-mono mb-4">Multi-Sensor Degradation Signatures</h3>
          {!isSensorsLoading && multiSensorData.length > 0 ? (
            <div className="flex-1 w-full">
               <PlotlyChart 
                data={multiSensorData}
                layout={{
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.2, x: 0 },
                  margin: { t: 10, r: 40, l: 40, b: 20 },
                  yaxis: { title: { text: 'T50 (°R)', font: { color: '#ef4444' } }, tickfont: { color: '#ef4444' } },
                  yaxis2: { title: { text: 'NF (rpm)', font: { color: '#3b82f6' } }, overlaying: 'y', side: 'right', tickfont: { color: '#3b82f6' }, position: 0.95 },
                  yaxis3: { title: { text: 'P30 (psia)', font: { color: '#10b981' } }, overlaying: 'y', side: 'right', tickfont: { color: '#10b981' } }
                }}
              />
            </div>
          ) : (
             <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-sm">Loading sensor data...</div>
          )}
        </div>

        {/* Top Contributors */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-200 font-mono mb-4">Top AI Contributors to Risk</h3>
          <div className="flex-1 w-full">
            <PlotlyChart 
              data={topContributorsData}
              layout={{
                margin: { t: 10, l: 40, r: 10, b: 30 },
                xaxis: { title: { text: 'Contribution %' } }
              }}
            />
          </div>
        </div>
      </div>

      {/* Recommendations & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-200 font-mono mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Prescriptive Maintenance
          </h3>
          <div className="space-y-4">
            {engine.recommendations.map((rec, i) => (
              <div key={i} className={`p-4 rounded-xl border ${rec.priority === 'high' ? 'bg-rose-500/10 border-rose-500/30' : rec.priority === 'medium' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-bold text-sm ${rec.priority === 'high' ? 'text-rose-700 dark:text-rose-400' : rec.priority === 'medium' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>{rec.action}</h4>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded">{rec.priority} Priority</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{rec.description}</p>
                {rec.estimatedDowntimeHours > 0 && (
                   <p className="text-[10px] font-mono mt-3 text-slate-500">EST. DOWNTIME: {rec.estimatedDowntimeHours} HOURS</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Engine Alerts */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-200 font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Associated Alerts
            </h3>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded font-mono font-bold text-slate-600 dark:text-slate-300">
              {engineAlerts.length} TOTAL
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {engineAlerts.length === 0 ? (
              <p className="text-sm text-slate-500 font-mono italic">No alerts recorded for this engine.</p>
            ) : (
              engineAlerts.map(alert => (
                <div key={alert.alertId} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${alert.severity === 'critical' ? 'bg-rose-500' : alert.severity === 'warning' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{alert.alertId}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${alert.status === 'open' ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>{alert.status}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{alert.title}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
