import React from 'react';
import { Settings as SettingsIcon, Save, Bell, Gauge, RefreshCw, Palette } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Since we update locally onChange, this is mostly visual feedback
    // but mimics an API call save action.
    toast.success('Settings saved successfully');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#0B1121]">
      <div className="p-6 md:p-10 max-w-4xl mx-auto w-full overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">System Settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">Manage application preferences and thresholds</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Risk Thresholds */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Risk Thresholds (RUL)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-slate-500 uppercase">Critical Alert (Cycles remaining)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.riskThresholds.critical}
                  onChange={(e) => updateSettings({
                    riskThresholds: { ...settings.riskThresholds, critical: Number(e.target.value) }
                  })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-slate-500 uppercase">Warning Alert (Cycles remaining)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.riskThresholds.warning}
                  onChange={(e) => updateSettings({
                    riskThresholds: { ...settings.riskThresholds, warning: Number(e.target.value) }
                  })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Dashboard Preferences */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-4 h-4 text-sky-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Dashboard Preferences</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-slate-500 uppercase">Refresh Interval (Seconds)</label>
                <select
                  value={settings.refreshInterval}
                  onChange={(e) => updateSettings({ refreshInterval: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={5}>5 seconds</option>
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-slate-500 uppercase">Preferred Units</label>
                <select
                  value={settings.preferredUnits}
                  onChange={(e) => updateSettings({ preferredUnits: e.target.value as 'metric' | 'imperial' })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="metric">Metric (°C, kPa, mm)</option>
                  <option value="imperial">Imperial (°F, psi, in)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Theme & Display */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Theme & Display</h2>
            </div>
            <div className="flex flex-col gap-2 max-w-sm">
              <label className="text-xs font-mono text-slate-500 uppercase">Appearance Mode</label>
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className={`flex-1 py-1.5 text-xs font-bold font-mono rounded-md transition-colors ${theme === 'light' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Light Mode
                </button>
                <button
                  type="button"
                  onClick={() => theme === 'light' && toggleTheme()}
                  className={`flex-1 py-1.5 text-xs font-bold font-mono rounded-md transition-colors ${theme === 'dark' ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Dark Mode
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">Notification Preferences</h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.email}
                  onChange={(e) => updateSettings({
                    notifications: { ...settings.notifications, email: e.target.checked }
                  })}
                  className="w-4 h-4 text-indigo-500 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700"
                />
                <span className="text-sm font-mono text-slate-800 dark:text-slate-200">Email Alerts</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.push}
                  onChange={(e) => updateSettings({
                    notifications: { ...settings.notifications, push: e.target.checked }
                  })}
                  className="w-4 h-4 text-indigo-500 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700"
                />
                <span className="text-sm font-mono text-slate-800 dark:text-slate-200">Push Notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.criticalOnly}
                  onChange={(e) => updateSettings({
                    notifications: { ...settings.notifications, criticalOnly: e.target.checked }
                  })}
                  className="w-4 h-4 text-indigo-500 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700"
                />
                <span className="text-sm font-mono text-slate-800 dark:text-slate-200">Only notify on Critical Risk (RUL &lt; {settings.riskThresholds.critical})</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-mono font-bold flex items-center gap-2 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
