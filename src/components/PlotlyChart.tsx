import React from 'react';
import Plot from 'react-plotly.js';
import type { Data, Layout as PlotlyLayout } from 'plotly.js';
import { useTheme } from '../context/ThemeContext';

interface PlotlyChartProps {
  data: Data[];
  layout?: Partial<PlotlyLayout>;
  className?: string;
  useResizeHandler?: boolean;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({
  data,
  layout = {},
  className = 'w-full h-full min-h-[250px]',
  useResizeHandler = true,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const defaultLayout: Partial<PlotlyLayout> = {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: {
      family: '"Inter", sans-serif',
      color: isDark ? '#94a3b8' : '#475569', // slate-400 : slate-600
      size: 11,
    },
    margin: { t: 24, r: 20, b: 40, l: 45 },
    xaxis: {
      gridcolor: isDark ? '#1e293b' : '#e2e8f0', // slate-800 : slate-200
      zerolinecolor: isDark ? '#334155' : '#cbd5e1',
      tickfont: { color: isDark ? '#64748b' : '#64748b' },
    },
    yaxis: {
      gridcolor: isDark ? '#1e293b' : '#e2e8f0',
      zerolinecolor: isDark ? '#334155' : '#cbd5e1',
      tickfont: { color: isDark ? '#64748b' : '#64748b' },
    },
    legend: {
      orientation: 'h',
      y: 1.15,
      x: 0,
      font: { size: 10 },
    },
    hovermode: 'closest',
    ...layout,
  };

  return (
    <div className={className}>
      <Plot
        data={data}
        layout={defaultLayout}
        config={{
          displayModeBar: false,
          responsive: true,
        }}
        useResizeHandler={useResizeHandler}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
