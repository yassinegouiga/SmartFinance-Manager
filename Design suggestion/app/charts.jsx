
const { useRef: useRefC, useEffect: useEffectC, useLayoutEffect: useLayoutEffectC } = React;
function ChartCanvas({ type, data, options, height = 240 }) {
  const wrapRef = useRefC(null);
  const ref = useRefC(null);
  const inst = useRefC(null);
  useLayoutEffectC(() => {
    let ro, cancelled = false;
    if (!ref.current || typeof Chart === "undefined") return;
    const ctx = ref.current.getContext("2d");
    inst.current = new Chart(ctx, { type, data, options });
    if (wrapRef.current) {
      ro = new ResizeObserver(() => { if (inst.current) inst.current.resize(); });
      ro.observe(wrapRef.current);
    }
    return () => {
      cancelled = true;
      if (ro) ro.disconnect();
      if (inst.current) { inst.current.destroy(); inst.current = null; }
    };
  }, [type, JSON.stringify(data), JSON.stringify(options)]);
  return <div ref={wrapRef} style={{ position: "relative", height, minHeight: height, width: "100%" }}><canvas ref={ref} /></div>;
}
function chartTheme() {
  const cs = getComputedStyle(document.documentElement);
  const g = (v) => cs.getPropertyValue(v).trim();
  return {
    text: g("--text-2") || "#a3adbd",
    faint: g("--text-3") || "#6b7689",
    grid: (g("--border-soft") || "#1e242f"),
    surface: g("--surface") || "#14181f",
    accent: g("--accent-2") || "#34d399",
  };
}

function gridOpts(t, money) {
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.surface, borderColor: t.grid, borderWidth: 1, titleColor: t.text, bodyColor: t.text,
        padding: 11, cornerRadius: 10, displayColors: true, boxPadding: 4,
        titleFont: { family: "Plus Jakarta Sans", weight: "700" }, bodyFont: { family: "Plus Jakarta Sans" },
        callbacks: money ? { label: (c) => "  " + window.fmtMoney(c.parsed.y ?? c.parsed, window.__cur || "USD") } : undefined,
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: t.faint, font: { family: "Plus Jakarta Sans", weight: "600", size: 11 } } },
      y: { grid: { color: t.grid }, border: { display: false }, ticks: { color: t.faint, font: { family: "Plus Jakarta Sans", size: 11 }, maxTicksLimit: 5, callback: (v) => money ? (window.CURRENCIES[window.__cur||"USD"].symbol + (v >= 1000 ? v/1000 + "k" : v)) : v } },
    },
  };
}

Object.assign(window, { ChartCanvas, chartTheme, gridOpts });
