import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpDown,
  BatteryWarning,
  Clock,
  Filter,
  Flame,
  Gauge,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Activity,
  ChevronRight,
  Download,
} from 'lucide-react';
import { useFleet } from '../hooks/useFleet';
import { RiskBadge } from '../components/RiskBadge';
import { PlotlyChart } from '../components/PlotlyChart';
import type { RiskCategory, EngineSummary } from '../api/types';
import { useTheme } from '../context/ThemeContext';
import { exportToCsv } from '../lib/exportCsv';

export const FleetDashboard: React.FC = () => {
  const { data: fleet, isLoading, error, refetch, isRefetching } = useFleet();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFleetGroup, setSelectedFleetGroup] = useState<string>('all');
  
  const [minRul, setMinRul] = useState<number | ''>('');
  const [maxRul, setMaxRul] = useState<number | ''>('');
  const [minHealthScore, setMinHealthScore] = useState<number | ''>('');
  const [maxHealthScore, setMaxHealthScore] = useState<number | ''>('');
  const [openAlertsFilter, setOpenAlertsFilter] = useState<'all' | 'yes' | 'no'>('all');

  const [sortBy, setSortBy] = useState<keyof EngineSummary>('estimatedRul');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filtered & Sorted engines list
  const filteredEngines = useMemo(() => {
    if (!fleet?.engines) return [];

    return fleet.engines
      .filter((eng) => {
        const matchesSearch = eng.engineId.toLowerCase().includes(search.toLowerCase()) || eng.modelType.toLowerCase().includes(search.toLowerCase());
        const matchesCat = selectedCategory === 'all' || eng.riskCategory === selectedCategory;
        const matchesFleet = selectedFleetGroup === 'all' || eng.fleetGroup === selectedFleetGroup;
        
        const matchesMinRul = minRul === '' || eng.estimatedRul >= Number(minRul);
        const matchesMaxRul = maxRul === '' || eng.estimatedRul <= Number(maxRul);
        
        const matchesMinHealth = minHealthScore === '' || eng.healthScore >= Number(minHealthScore);
        const matchesMaxHealth = maxHealthScore === '' || eng.healthScore <= Number(maxHealthScore);
        
        let matchesAlerts = true;
        if (openAlertsFilter === 'yes') matchesAlerts = eng.openAlertsCount > 0;
        if (openAlertsFilter === 'no') matchesAlerts = eng.openAlertsCount === 0;

        return matchesSearch && matchesCat && matchesFleet && matchesMinRul && matchesMaxRul && matchesMinHealth && matchesMaxHealth && matchesAlerts;
      })
      .sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
  }, [fleet?.engines, search, selectedCategory, selectedFleetGroup, minRul, maxRul, minHealthScore, maxHealthScore, openAlertsFilter, sortBy, sortOrder]);

  // Unique fleet groups for picker
  const fleetGroups = useMemo(() => {
    if (!fleet?.engines) return [];
    return Array.from(new Set(fleet.engines.map((e) => e.fleetGroup)));
  }, [fleet?.engines]);

  // Chart 1: Risk Distribution (Donut / Bar)
  const pieChartData = useMemo(() => {
    if (!fleet?.distribution) return [];
    const { healthy, watch, warning, critical } = fleet.distribution;

    return [
      {
        values: [healthy, watch, warning, critical],
        labels: ['Healthy', 'Watch', 'Warning', 'Critical'],
        type: 'pie' as const,
        hole: 0.65,
        marker: {
          colors: ['#10b981', '#0ea5e9', '#f59e0b', '#f43f5e'],
          line: { color: isDark ? '#0f172a' : '#ffffff', width: 2 },
        },
        textinfo: 'label+percent' as const,
        textposition: 'outside' as const,
        hoverinfo: 'label+value+percent' as const,
      },
    ];
  }, [fleet?.distribution]);

  // Chart 2: RUL Histogram
  const rulHistogramData = useMemo(() => {
    if (!fleet?.engines) return [];
    const ruls = fleet.engines.map((e) => e.estimatedRul);

    return [
      {
        x: ruls,
        type: 'histogram' as const,
        xbins: { start: 0, end: 320, size: 25 },
        marker: {
          color: '#6366f1', // indigo-500
          line: { color: '#818cf8', width: 1 },
          opacity: 0.85,
        },
        hovertemplate: 'RUL Range: %{x} cycles<br>Engines count: %{y}<extra></extra>',
      },
    ];
  }, [fleet?.engines]);

  const toggleSort = (field: keyof EngineSummary) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-sm font-mono text-slate-400">Querying FastAPI fleet telemetry (GET /api/v1/fleet)...</p>
      </div>
    );
  }

  if (error || !fleet) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6 text-rose-400 flex items-center gap-4">
        <ShieldAlert className="w-8 h-8 flex-shrink-0" />
        <div>
          <h3 className="font-bold">Telemetry Connection Error</h3>
          <p className="text-xs font-mono">{error?.message || 'Failed to fetch fleet data'}</p>
          <button onClick={() => refetch()} className="mt-2 px-3 py-1 bg-rose-500 text-white rounded text-xs font-bold">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { kpis } = fleet;

  return (
    <div className="space-y-8">
      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Turbofan Fleet Overview
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
            Real-time AI Remaining Useful Life (RUL) inference across {kpis.totalEngines} active propulsion units
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>{isRefetching ? 'Syncing...' : 'Live Refresh'}</span>
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Run AI Retraining</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono font-bold tracking-widest">Total Engines</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 font-mono">{kpis.totalEngines}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> 100% telemetry online
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-rose-200 dark:border-rose-900/40 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-rose-600 dark:text-rose-400 text-[10px] uppercase font-mono font-bold tracking-widest">Critical Engines</p>
              <h3 className="text-3xl font-extrabold text-rose-600 dark:text-rose-500 mt-1.5 font-mono drop-shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                {String(kpis.criticalEngines).padStart(2, '0')}
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 animate-pulse">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-rose-500 mt-3 font-semibold">RUL ≤ 20 cycles limit</p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-amber-200 dark:border-amber-900/40 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-amber-600 dark:text-amber-400 text-[10px] uppercase font-mono font-bold tracking-widest">Warning Engines</p>
              <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-500 mt-1.5 font-mono">{kpis.warningEngines}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BatteryWarning className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-amber-500 mt-3 font-semibold">20 &lt; RUL ≤ 55 cycles</p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono font-bold tracking-widest">Average RUL</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 font-mono italic">
                {kpis.averageRul} <span className="text-xs font-normal not-italic text-slate-400 uppercase">cyc</span>
              </h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-3">NASA Target: &gt;110 cyc</p>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-sky-200 dark:border-sky-900/40 p-5 rounded-2xl shadow-sm sm:col-span-3 lg:col-span-1 relative overflow-hidden cursor-pointer" onClick={() => navigate('/alerts')}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sky-600 dark:text-sky-400 text-[10px] uppercase font-mono font-bold tracking-widest">Open Alerts</p>
              <h3 className="text-3xl font-extrabold text-sky-600 dark:text-sky-400 mt-1.5 font-mono">{kpis.openAlerts}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] font-mono text-indigo-500 mt-3 font-semibold flex items-center gap-1">
            Review Alerts Center <ChevronRight className="w-3 h-3" />
          </p>
        </div>
      </div>

      {/* Middle Section: Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Risk Distribution Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-200 font-mono">Fleet Risk Distribution</h3>
              <p className="text-[10px] text-slate-400">Categorized by deep LSTM failure probability</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">100 UNITS</span>
          </div>
          <div className="flex-1 w-full flex items-center justify-center">
            <PlotlyChart
              data={pieChartData}
              layout={{
                showlegend: true,
                legend: { orientation: 'h', y: -0.1, x: 0.1 },
                margin: { t: 10, b: 30, l: 10, r: 10 },
              }}
              className="w-full h-[280px]"
            />
          </div>
        </div>

        {/* RUL Histogram Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col min-h-[380px]">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-200 font-mono">RUL Histogram (Remaining Cycles)</h3>
              <p className="text-[10px] text-slate-400">Distribution of predicted engine life span across fleet</p>
            </div>
            <span className="text-[10px] font-mono text-indigo-500 font-bold">BIN SIZE: 25 CYC</span>
          </div>
          <div className="flex-1 w-full">
            <PlotlyChart
              data={rulHistogramData}
              layout={{
                xaxis: { title: { text: 'Estimated RUL (Cycles)', font: { size: 11 } }, gridcolor: '#33415533' },
                yaxis: { title: { text: 'Engine Count', font: { size: 11 } }, gridcolor: '#33415533' },
                bargap: 0.1,
                margin: { t: 20, r: 20, b: 45, l: 45 },
              }}
              className="w-full h-[280px]"
            />
          </div>
        </div>
      </div>

      {/* Fleet Table Section */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Header Controls */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                <Gauge className="w-4 h-4 text-indigo-500" /> Active Fleet Registry ({filteredEngines.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click any row or &quot;View Details&quot; to inspect sensor time-series &amp; AI diagnostics</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search Engine ID or Model..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              {/* Export CSV Button */}
              <button
                onClick={() => {
                  const cols = [
                    { header: 'Engine ID', key: 'engineId' as keyof EngineSummary },
                    { header: 'Fleet Group', key: 'fleetGroup' as keyof EngineSummary },
                    { header: 'Model Type', key: 'modelType' as keyof EngineSummary },
                    { header: 'Latest Cycle', key: 'latestCycle' as keyof EngineSummary },
                    { header: 'Est. RUL', key: 'estimatedRul' as keyof EngineSummary },
                    { header: 'Health Score', key: 'healthScore' as keyof EngineSummary },
                    { header: 'Failure Prob.', key: 'failureProbability' as keyof EngineSummary },
                    { header: 'Risk Category', key: 'riskCategory' as keyof EngineSummary },
                    { header: 'Open Alerts Count', key: 'openAlertsCount' as keyof EngineSummary }
                  ];
                  exportToCsv('fleet_export', filteredEngines, cols);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                title="Export to CSV"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>
          
          {/* Advanced Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase">Risk Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 px-2 py-1.5 focus:outline-none"
              >
                <option value="all">All Risks</option>
                <option value="critical">Critical Only</option>
                <option value="warning">Warning Only</option>
                <option value="watch">Watch Only</option>
                <option value="healthy">Healthy Only</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase">Fleet Group</label>
              <select
                value={selectedFleetGroup}
                onChange={(e) => setSelectedFleetGroup(e.target.value)}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 px-2 py-1.5 focus:outline-none"
              >
                <option value="all">All Fleets</option>
                {fleetGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase">RUL Range</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Min"
                  value={minRul}
                  onChange={(e) => setMinRul(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 px-2 py-1.5 focus:outline-none min-w-[60px]"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxRul}
                  onChange={(e) => setMaxRul(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 px-2 py-1.5 focus:outline-none min-w-[60px]"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase">Health Score</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Min"
                  value={minHealthScore}
                  onChange={(e) => setMinHealthScore(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 px-2 py-1.5 focus:outline-none min-w-[60px]"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxHealthScore}
                  onChange={(e) => setMaxHealthScore(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 px-2 py-1.5 focus:outline-none min-w-[60px]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-slate-500 uppercase">Open Alerts</label>
              <select
                value={openAlertsFilter}
                onChange={(e) => setOpenAlertsFilter(e.target.value as any)}
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 px-2 py-1.5 focus:outline-none"
              >
                <option value="all">Any</option>
                <option value="yes">Has Open Alerts</option>
                <option value="no">No Open Alerts</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                  setSelectedFleetGroup('all');
                  setMinRul('');
                  setMaxRul('');
                  setMinHealthScore('');
                  setMaxHealthScore('');
                  setOpenAlertsFilter('all');
                }}
                className="text-xs font-mono text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 mb-2 underline decoration-indigo-500/30 underline-offset-4"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-950/60 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => toggleSort('engineId')}>
                  <div className="flex items-center gap-1">Engine ID <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-3.5">Fleet / Model</th>
                <th className="px-6 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => toggleSort('latestCycle')}>
                  <div className="flex items-center gap-1">Latest Cycle <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => toggleSort('estimatedRul')}>
                  <div className="flex items-center gap-1">Est. RUL <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => toggleSort('healthScore')}>
                  <div className="flex items-center gap-1">Health Score <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-3.5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => toggleSort('failureProbability')}>
                  <div className="flex items-center gap-1">Failure Prob. <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-3.5">Risk Category</th>
                <th className="px-6 py-3.5 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => toggleSort('openAlertsCount')}>
                  <div className="flex items-center justify-center gap-1">Alerts <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-xs font-mono text-slate-700 dark:text-slate-300">
              {filteredEngines.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    No engines matching selected search &amp; risk filters.
                  </td>
                </tr>
              ) : (
                filteredEngines.map((eng) => (
                  <tr
                    key={eng.engineId}
                    onClick={() => navigate(`/engines/${eng.engineId}`)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {eng.engineId}
                    </td>
                    <td className="px-6 py-4">
                      <span className="block text-slate-900 dark:text-slate-200 font-sans font-semibold">{eng.fleetGroup}</span>
                      <span className="text-[10px] text-slate-400">{eng.modelType}</span>
                    </td>
                    <td className="px-6 py-4">{eng.latestCycle} cyc</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${eng.estimatedRul <= 20 ? 'text-rose-600 dark:text-rose-400 animate-pulse' : eng.estimatedRul <= 55 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-200'}`}>
                        {eng.estimatedRul} Cycles
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-16 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${eng.healthScore < 30 ? 'bg-rose-500' : eng.healthScore < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${eng.healthScore}%` }}
                          />
                        </div>
                        <span className="font-bold">{eng.healthScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {(eng.failureProbability * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <RiskBadge category={eng.riskCategory} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      {eng.openAlertsCount > 0 ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[11px] ring-1 ring-rose-500/20">
                          {eng.openAlertsCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/engines/${eng.engineId}`)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 font-sans text-xs font-semibold transition-all shadow-sm border border-indigo-200 dark:border-indigo-800/40 cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Showing {filteredEngines.length} of {kpis.totalEngines} turbofans</span>
          <span className="text-[10px]">API ENDPOINT: GET /api/v1/fleet</span>
        </div>
      </div>
    </div>
  );
};
