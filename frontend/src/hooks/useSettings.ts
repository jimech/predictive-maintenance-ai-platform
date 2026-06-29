import { useState, useEffect } from 'react';

export interface UserSettings {
  riskThresholds: {
    critical: number; // RUL < this -> critical
    warning: number;  // RUL < this -> warning
  };
  refreshInterval: number; // seconds
  preferredUnits: 'metric' | 'imperial';
  notifications: {
    email: boolean;
    push: boolean;
    criticalOnly: boolean;
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  riskThresholds: {
    critical: 15,
    warning: 30,
  },
  refreshInterval: 15,
  preferredUnits: 'metric',
  notifications: {
    email: true,
    push: false,
    criticalOnly: true,
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('user_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('user_settings', JSON.stringify(updated));
      return updated;
    });
  };

  return { settings, updateSettings };
}
