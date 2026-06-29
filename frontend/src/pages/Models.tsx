import React from 'react';
import { Cpu, CheckCircle2, TrendingUp, HelpCircle, Download } from 'lucide-react';
import { useModels } from '../hooks/useModels';
import { exportToCsv } from '../lib/exportCsv';

export const Models: React.FC = () => {
  const { data: models, isLoading, error, refetch } = useModels();

  if (isLoading) {
    return <div className="p-8 text-center font-mono text-slate-500">Loading model benchmarks...</div>;
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
        <p className="font-mono font-bold mb-2">Failed to load models.</p>
        <p className="text-xs font-mono mb-4">{error.message}</p>
        <button onClick={() => refetch()} className="px-3 py-1 bg-rose-500 text-white rounded text-xs font-bold">
          Retry
        </button>
      </div>
    );
  }

  if (!models || models.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
        <Cpu className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No models registered</h3>
        <p className="text-xs text-slate-500 mt-1">Train a model from the Admin page to populate this list.</p>
      </div>
    );
  }

  const prodModel = models.find(m => m.isProduction);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-3">
          <Cpu className="w-6 h-6 text-indigo-500" />
          Model Benchmarks
        </h1>
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">Evaluate AI architectures predicting Remaining Useful Life (RUL)</p>
      </div>

      {prodModel && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-lg shadow-indigo-900/20 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Active Production Model
              </span>
              <span className="text-indigo-300 font-mono text-xs">{prodModel.version}</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{prodModel.name}</h2>
            <p className="text-sm text-slate-400">Trained on {prodModel.trainingDataset}</p>
          </div>
          
          <div className="flex gap-4">
             <div className="bg-black/40 border border-white/10 p-4 rounded-xl text-center min-w-[100px]">
               <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">NASA Score</div>
               <div className="text-2xl font-bold text-white font-mono">{prodModel.nasaScore}</div>
             </div>
             <div className="bg-black/40 border border-white/10 p-4 rounded-xl text-center min-w-[100px]">
               <div className="text-[10px] text-slate-400 uppercase font-mono mb-1">RMSE</div>
               <div className="text-2xl font-bold text-white font-mono">{prodModel.rmse}</div>
             </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
           <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Algorithm Registry</h3>
           <div className="flex items-center gap-3">
             <button
                onClick={() => {
                  const cols = [
                    { header: 'Model ID', key: 'modelId' as const },
                    { header: 'Name', key: 'name' as const },
                    { header: 'Architecture', key: 'architecture' as const },
                    { header: 'Version', key: 'version' as const },
                    { header: 'Training Dataset', key: 'trainingDataset' as const },
                    { header: 'MAE', key: 'mae' as const },
                    { header: 'RMSE', key: 'rmse' as const },
                    { header: 'NASA Score', key: 'nasaScore' as const },
                    { header: 'Inference Time (ms)', key: 'inferenceTimeMs' as const },
                    { header: 'Production', key: 'isProduction' as const }
                  ];
                  exportToCsv('models_export', models || [], cols);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
             >
                <Download className="w-3.5 h-3.5" /> Export CSV
             </button>
             <button className="text-[10px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"><HelpCircle className="w-3 h-3"/> Score Metrics Guide</button>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-950/40 text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 font-semibold">Model ID / Name</th>
                <th className="px-6 py-4 font-semibold">Architecture</th>
                <th className="px-6 py-4 font-semibold text-right">MAE</th>
                <th className="px-6 py-4 font-semibold text-right">RMSE</th>
                <th className="px-6 py-4 font-semibold text-right">NASA Asym Score</th>
                <th className="px-6 py-4 font-semibold text-center">Inference Time</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-200 dark:divide-slate-800/50 font-mono">
              {models.map((model) => (
                <tr key={model.modelId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 dark:text-white">{model.modelId}</div>
                    <div className="text-xs text-slate-500 font-sans mt-0.5">{model.name}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{model.architecture}</td>
                  <td className="px-6 py-4 text-right text-slate-700 dark:text-slate-300">{model.mae}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">{model.rmse}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold ${model.nasaScore < 300 ? 'text-emerald-600 dark:text-emerald-400' : model.nasaScore < 600 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {model.nasaScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{model.inferenceTimeMs}ms</td>
                  <td className="px-6 py-4 text-center">
                    {model.isProduction ? (
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded uppercase">Production</span>
                    ) : (
                       <span className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold rounded uppercase border border-slate-300 dark:border-slate-700">Shadow Mode</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
