import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Filter, AlertCircle, Download } from 'lucide-react';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '../hooks/useAlerts';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { exportToCsv } from '../lib/exportCsv';

export const Alerts: React.FC = () => {
  const { data: alerts, isLoading, error, refetch } = useAlerts();
  const ackMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredAlerts = alerts?.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

  if (isLoading) {
    return <div className="p-8 text-center font-mono text-slate-500">Loading alerts...</div>;
  }

  if (error) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
        <p className="font-mono font-bold mb-2">Failed to load alerts.</p>
        <p className="text-xs font-mono mb-4">{error.message}</p>
        <button onClick={() => refetch()} className="px-3 py-1 bg-rose-500 text-white rounded text-xs font-bold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Alerts Center
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">Review and acknowledge predictive anomalies</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400 ml-1" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all" className="bg-white dark:bg-slate-900">All Statuses</option>
              <option value="open" className="bg-white dark:bg-slate-900">Open</option>
              <option value="acknowledged" className="bg-white dark:bg-slate-900">Acknowledged</option>
              <option value="resolved" className="bg-white dark:bg-slate-900">Resolved</option>
            </select>
            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
            <select 
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none pr-1"
            >
              <option value="all" className="bg-white dark:bg-slate-900">All Severities</option>
              <option value="critical" className="bg-white dark:bg-slate-900">Critical</option>
              <option value="warning" className="bg-white dark:bg-slate-900">Warning</option>
              <option value="info" className="bg-white dark:bg-slate-900">Info</option>
            </select>
          </div>
          <button
            onClick={() => {
              const cols = [
                { header: 'Alert ID', key: 'alertId' as const },
                { header: 'Engine ID', key: 'engineId' as const },
                { header: 'Severity', key: 'severity' as const },
                { header: 'Status', key: 'status' as const },
                { header: 'Title', key: 'title' as const },
                { header: 'Description', key: 'description' as const },
                { header: 'Sensor Triggered', key: 'sensorTriggered' as const },
                { header: 'Current Value', key: 'currentValue' as const },
                { header: 'Threshold', key: 'thresholdValue' as const },
                { header: 'Unit', key: 'unit' as const },
                { header: 'Created At', key: 'createdAt' as const }
              ];
              exportToCsv('alerts_export', filteredAlerts, cols);
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No alerts found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div key={alert.alertId} className={`flex flex-col md:flex-row gap-6 p-6 rounded-2xl border ${alert.status === 'open' && alert.severity === 'critical' ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'}`}>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${alert.severity === 'critical' ? 'bg-rose-500 text-white' : alert.severity === 'warning' ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white'}`}>
                    {alert.severity}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest border ${alert.status === 'open' ? 'bg-white dark:bg-slate-950 border-rose-500/50 text-rose-500' : alert.status === 'acknowledged' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'}`}>
                    {alert.status}
                  </span>
                  <span className="text-xs font-mono text-slate-500 ml-auto flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {alert.title} <span className="text-slate-400 font-normal">on</span> <Link to={`/engines/${alert.engineId}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{alert.engineId}</Link>
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{alert.description}</p>
                
                {(alert.currentValue && alert.thresholdValue) && (
                  <div className="inline-flex gap-4 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono mt-2">
                    <div>
                      <span className="text-slate-500 block mb-1">Trigger Sensor</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{alert.sensorTriggered}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Current Value</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{alert.currentValue} {alert.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Threshold Limit</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{alert.thresholdValue} {alert.unit}</span>
                    </div>
                  </div>
                )}
                
                {(alert.acknowledgedBy || alert.resolvedAt) && (
                  <div className="text-[10px] font-mono text-slate-500 pt-2 flex gap-4">
                    {alert.acknowledgedBy && <span>Ack'd by: {alert.acknowledgedBy}</span>}
                    {alert.resolvedAt && <span>Resolved: {new Date(alert.resolvedAt).toLocaleString()}</span>}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex md:flex-col justify-end gap-2 md:min-w-[140px] pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 md:pl-6">
                {alert.status === 'open' && (
                  <button 
                    onClick={() => ackMutation.mutate({ alertId: alert.alertId, userName: user?.name })}
                    disabled={ackMutation.isPending}
                    className="w-full py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-lg transition-colors border border-indigo-200 dark:border-indigo-500/30"
                  >
                    Acknowledge
                  </button>
                )}
                {(alert.status === 'open' || alert.status === 'acknowledged') && (
                  <button 
                    onClick={() => resolveMutation.mutate(alert.alertId)}
                    disabled={resolveMutation.isPending}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Mark Resolved
                  </button>
                )}
                {alert.status === 'resolved' && (
                  <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold h-full">
                    <CheckCircle2 className="w-4 h-4" /> Resolved
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};
