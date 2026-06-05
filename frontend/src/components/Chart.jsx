import { useRef, useLayoutEffect } from 'react';
import {
  Chart,
  BarController, BarElement,
  LineController, LineElement, PointElement,
  ArcElement, DoughnutController,
  CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
} from 'chart.js';
import { fmtMoney, CURRENCIES } from '../utils/format';

Chart.register(
  BarController, BarElement,
  LineController, LineElement, PointElement,
  ArcElement, DoughnutController,
  CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
);

/**
 * Generic Chart.js canvas wrapper — recreates the chart when its config
 * changes and resizes with its container.
 */
export function ChartCanvas({ type, data, options, height = 240 }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const inst = useRef(null);

  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    inst.current = new Chart(ctx, { type, data, options });
    let ro;
    if (wrapRef.current) {
      ro = new ResizeObserver(() => { if (inst.current) inst.current.resize(); });
      ro.observe(wrapRef.current);
    }
    return () => {
      if (ro) ro.disconnect();
      if (inst.current) { inst.current.destroy(); inst.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, JSON.stringify(data), JSON.stringify(options)]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', height, minHeight: height, width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

/** Reads the live design tokens so charts follow the active theme. */
export function chartTheme() {
  const cs = getComputedStyle(document.documentElement);
  const g = (v) => cs.getPropertyValue(v).trim();
  return {
    text:    g('--text-2')     || '#a3adbd',
    faint:   g('--text-3')     || '#6b7689',
    grid:    g('--border-soft')|| '#1e242f',
    surface: g('--surface')    || '#14181f',
    accent:  g('--accent-2')   || '#34d399',
  };
}

/** Shared axis/tooltip options for bar & line charts. `money` formats values. */
export function gridOpts(t, money, cur = 'USD') {
  const symbol = (CURRENCIES[cur] || CURRENCIES.USD).symbol;
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.surface, borderColor: t.grid, borderWidth: 1,
        titleColor: t.text, bodyColor: t.text, padding: 11, cornerRadius: 10,
        displayColors: true, boxPadding: 4,
        titleFont: { family: 'Plus Jakarta Sans', weight: '700' },
        bodyFont: { family: 'Plus Jakarta Sans' },
        callbacks: money ? { label: (c) => '  ' + fmtMoney(c.parsed.y ?? c.parsed, cur) } : undefined,
      },
    },
    scales: {
      x: {
        grid: { display: false }, border: { display: false },
        ticks: { color: t.faint, font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 } },
      },
      y: {
        grid: { color: t.grid }, border: { display: false },
        ticks: {
          color: t.faint, font: { family: 'Plus Jakarta Sans', size: 11 }, maxTicksLimit: 5,
          callback: (v) => money ? (symbol + (v >= 1000 ? v / 1000 + 'k' : v)) : v,
        },
      },
    },
  };
}
