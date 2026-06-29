import React from 'react';
import { Database, Play, Loader2, Server, CheckCircle, DatabaseZap } from 'lucide-react';
import { useAdminStatus, usePipelineActions } from '../hooks/useAdmin';

export const Admin: React.FC = () => {
  const { data: adminStatus, isLoading } = useAdminStatus();
  const { loadMutation, preprocessMutation, trainMutation } = usePipelineActions();

  if (isLoading || !adminStatus) {
    return <div className="p-8 text-center font-mono text-slate-500">Connecting to FastAPI workers...</div>;
  }

  const { dataset, activeJob } = adminStatus;
  const isJobRunning = activeJob.status === 'running';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-3">
          <Server className="w-6 h-6 text-slate-500" />
          Data & ML Pipeline Admin
        </h1>
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">Trigger server-side FastAPI tasks (Data Loading, Preprocessing, Training)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dataset Status */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-200 font-mono mb-6 flex items-center gap-2">
             <Database className="w-4 h-4 text-indigo-500" /> Active CMAPSS Dataset
          </h2>
          
          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Dataset ID</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{dataset.datasetId}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Total Engines</span>
              <span className="text-slate-800 dark:text-slate-200">{dataset.totalEngines}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Sensor Records</span>
              <span className="text-slate-800 dark:text-slate-200">{dataset.totalSensorRecords.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500">Status</span>
              <span className="flex items-center gap-2">
                {dataset.isPreprocessed ? (
                  <><span className="w-2 h-2 rounded-full bg-emerald-500" /> Preprocessed & Ready</>
                ) : dataset.isLoaded ? (
                  <><span className="w-2 h-2 rounded-full bg-amber-500" /> Raw (Needs Preprocessing)</>
                ) : (
                  <><span className="w-2 h-2 rounded-full bg-rose-500" /> Not Loaded</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Pipeline Actions */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
           <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-200 font-mono mb-4 flex items-center gap-2">
             <Play className="w-4 h-4 text-indigo-500" /> Worker Execution Hooks
          </h2>

          <div className="flex-1 space-y-3 flex flex-col justify-center">
            <button 
              onClick={() => loadMutation.mutate()}
              disabled={isJobRunning}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold font-mono text-xs rounded-xl transition-all flex items-center justify-between disabled:opacity-50"
            >
              <span>1. POST /api/v1/admin/datasets/load</span>
              <DatabaseZap className="w-4 h-4" />
            </button>

            <button 
              onClick={() => preprocessMutation.mutate()}
              disabled={isJobRunning || !dataset.isLoaded}
              className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 font-bold font-mono text-xs rounded-xl transition-all flex items-center justify-between disabled:opacity-50"
            >
              <span>2. POST /api/v1/admin/preprocess</span>
              <Play className="w-4 h-4" />
            </button>

             <button 
              onClick={() => trainMutation.mutate('lstm')}
              disabled={isJobRunning || !dataset.isPreprocessed}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 font-bold font-mono text-xs rounded-xl transition-all flex items-center justify-between disabled:opacity-50"
            >
              <span>3. POST /api/v1/admin/train (LSTM)</span>
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* Terminal / Job Status Output */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Celery Worker Terminal Logs</span>
        </div>
        
        <div className="p-4 h-64 overflow-y-auto font-mono text-[11px] text-emerald-400 space-y-1 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 to-[#0f172a]">
          {activeJob.logs.map((log, i) => (
            <div key={i} className="opacity-90">{log}</div>
          ))}
          {isJobRunning && (
            <div className="flex items-center gap-2 mt-2 text-indigo-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Task {activeJob.action} in progress ({activeJob.progress}%)...
            </div>
          )}
          {!isJobRunning && activeJob.status === 'completed' && (
            <div className="flex items-center gap-2 mt-2 text-emerald-400 font-bold">
              <CheckCircle className="w-3 h-3" /> Worker idle.
            </div>
          )}
        </div>
        
        {isJobRunning && (
          <div className="h-1 bg-slate-800 w-full">
            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${activeJob.progress}%` }} />
          </div>
        )}
      </div>

    </div>
  );
};
