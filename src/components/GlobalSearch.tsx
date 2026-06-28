import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFleet } from '../hooks/useFleet';
import { useAlerts } from '../hooks/useAlerts';
import { useModels } from '../hooks/useModels';

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: fleet } = useFleet();
  const { data: alerts } = useAlerts();
  const { data: models } = useModels();

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = [];
  if (query.trim().length > 0) {
    const lowerQuery = query.toLowerCase();
    
    // Search engines
    if (fleet && fleet.engines) {
      fleet.engines.forEach(engine => {
        if (
          engine.engineId.toLowerCase().includes(lowerQuery) ||
          engine.fleetGroup.toLowerCase().includes(lowerQuery) ||
          engine.modelType.toLowerCase().includes(lowerQuery) ||
          engine.riskCategory.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            type: 'engine',
            id: engine.engineId,
            title: `Engine ${engine.engineId}`,
            subtitle: `${engine.modelType} | Risk: ${engine.riskCategory}`,
            link: `/engines/${engine.engineId}`
          });
        }
      });
    }

    // Search alerts
    if (alerts) {
      alerts.forEach(alert => {
        if (
          alert.alertId.toLowerCase().includes(lowerQuery) ||
          alert.title.toLowerCase().includes(lowerQuery) ||
          alert.severity.toLowerCase().includes(lowerQuery) ||
          alert.engineId.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            type: 'alert',
            id: alert.alertId,
            title: `Alert ${alert.alertId}: ${alert.title}`,
            subtitle: `Engine ${alert.engineId} | Severity: ${alert.severity}`,
            link: `/alerts`
          });
        }
      });
    }

    // Search models
    if (models) {
      models.forEach(model => {
        if (
          model.modelId.toLowerCase().includes(lowerQuery) ||
          model.name.toLowerCase().includes(lowerQuery) ||
          model.architecture.toLowerCase().includes(lowerQuery)
        ) {
          results.push({
            type: 'model',
            id: model.modelId,
            title: `Model ${model.modelId}: ${model.name}`,
            subtitle: `Architecture: ${model.architecture}`,
            link: `/models`
          });
        }
      });
    }
  }

  return (
    <div className="relative z-50 flex-1 max-w-sm ml-4 hidden md:block" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search engines, alerts, models..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
        />
      </div>

      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full mt-2 left-0 w-full max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 font-mono">No results found for "{query}"</div>
          ) : (
            <ul className="py-2">
              {results.slice(0, 10).map((res, i) => (
                <li key={`${res.type}-${res.id}-${i}`}>
                  <button
                    onClick={() => {
                      navigate(res.link);
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono truncate">{res.title}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{res.subtitle}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
