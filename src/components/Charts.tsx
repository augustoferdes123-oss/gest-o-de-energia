import React, { useMemo, useState } from "react";
import type { ForecastPoint, ScatterPoint, TimeSeriesPoint, UnitParetoItem } from "../types";
import { formatBRL, formatDateBR, formatNumber, formatShortDateBR } from "../utils/format";

type MetricMode = "custo" | "kwh" | "m3";

interface TimeSeriesForecastChartProps {
  timeSeries: TimeSeriesPoint[];
  forecast: ForecastPoint[];
  metric: MetricMode;
  showForecast?: boolean;
}

export const TimeSeriesForecastChart: React.FC<TimeSeriesForecastChartProps> = ({
  timeSeries,
  forecast,
  metric,
  showForecast = true,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const combined = useMemo(() => {
    const hist = timeSeries.map((pt) => ({
      data: pt.data,
      real: metric === "custo" ? pt.custo : metric === "kwh" ? pt.kwh : pt.m3,
      ma7: metric === "custo" ? pt.ma7_custo : metric === "kwh" ? pt.ma7_kwh : pt.ma7_m3,
      trend: metric === "custo" ? pt.trend_custo : metric === "kwh" ? pt.trend_kwh : pt.trend_m3,
      meta: metric === "custo" ? null : metric === "kwh" ? pt.meta_kwh : pt.meta_m3,
      anomalias: pt.anomalias,
      isForecast: false,
    }));

    const proj = showForecast
      ? forecast.map((f) => ({
          data: f.data,
          real: null as number | null,
          ma7: null as number | null,
          trend:
            metric === "custo"
              ? f.custo_previsto
              : metric === "kwh"
                ? f.kwh_previsto
                : f.m3_previsto,
          meta: null as number | null,
          anomalias: 0,
          isForecast: true,
        }))
      : [];

    return [...hist, ...proj];
  }, [timeSeries, forecast, metric, showForecast]);

  if (combined.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-500">
        Sem dados históricos suficientes para plotar a série temporal.
      </div>
    );
  }

  const width = 820;
  const height = 280;
  const padL = 62;
  const padR = 20;
  const padT = 20;
  const padB = 34;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const allValues = combined.flatMap((d) =>
    [d.real, d.ma7, d.trend, d.meta].filter((v): v is number => v !== null && !Number.isNaN(v))
  );
  const rawMax = Math.max(...allValues, 10);
  const yMax = rawMax * 1.12;
  const yMin = 0;

  const getX = (idx: number) =>
    combined.length === 1 ? padL + plotW / 2 : padL + (idx / (combined.length - 1)) * plotW;
  const getY = (val: number) => padT + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

  const histPoints = combined
    .map((d, i) => (d.real !== null ? `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(d.real).toFixed(1)}` : ""))
    .filter(Boolean)
    .join(" ");

  const histLastIdx = combined.reduce((acc, d, i) => (d.real !== null ? i : acc), 0);
  const areaPath =
    histPoints && histLastIdx > 0
      ? `${histPoints} L ${getX(histLastIdx).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
      : "";

  const ma7Path = combined
    .map((d, i) => (d.ma7 !== null ? `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(d.ma7).toFixed(1)}` : ""))
    .filter(Boolean)
    .join(" ");

  const trendPath = combined
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(d.trend).toFixed(1)}`)
    .join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => yMin + t * (yMax - yMin));
  const xLabelStep = Math.max(1, Math.floor(combined.length / 7));

  const formatMetricVal = (v: number) => {
    if (metric === "custo") return formatBRL(v);
    if (metric === "kwh") return `${formatNumber(v, 0)} kWh`;
    return `${formatNumber(v, 1)} m³`;
  };

  const activePoint = hoverIndex !== null ? combined[hoverIndex] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="ecoAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F766E" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0F766E" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {metric === "custo" ? `R$ ${Math.round(tick)}` : Math.round(tick)}
              </text>
            </g>
          );
        })}

        {/* Forecast separator */}
        {showForecast && forecast.length > 0 && histLastIdx < combined.length - 1 && (
          <g>
            <rect
              x={getX(histLastIdx)}
              y={padT}
              width={width - padR - getX(histLastIdx)}
              height={plotH}
              fill="#F1F5F9"
              opacity="0.65"
            />
            <line
              x1={getX(histLastIdx)}
              x2={getX(histLastIdx)}
              y1={padT}
              y2={padT + plotH}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text
              x={getX(histLastIdx) + 8}
              y={padT + 14}
              className="fill-slate-600 text-[10px] font-medium"
            >
              Previsão Linear (14d)
            </text>
          </g>
        )}

        {/* Area and series */}
        {areaPath && <path d={areaPath} fill="url(#ecoAreaGrad)" />}
        <path d={trendPath} fill="none" stroke="#64748B" strokeWidth="1.5" strokeDasharray="5 4" />
        {ma7Path && <path d={ma7Path} fill="none" stroke="#D97706" strokeWidth="1.75" />}
        {histPoints && <path d={histPoints} fill="none" stroke="#0F766E" strokeWidth="2.25" />}

        {/* Anomaly markers */}
        {combined.map((d, i) =>
          d.real !== null && d.anomalias > 0 ? (
            <circle
              key={`anom-${d.data}`}
              cx={getX(i)}
              cy={getY(d.real)}
              r="4.5"
              className="fill-red-600 stroke-white"
              strokeWidth="1.5"
            />
          ) : null
        )}

        {/* X axis labels */}
        {combined.map((d, i) => {
          if (i % xLabelStep !== 0 && i !== combined.length - 1) return null;
          return (
            <text
              key={`xlabel-${d.data}`}
              x={getX(i)}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-500 text-[10px] font-mono tabular-nums"
            >
              {formatShortDateBR(d.data)}
            </text>
          );
        })}

        {/* Hover line & active dot */}
        {hoverIndex !== null && combined[hoverIndex] && (
          <g>
            <line
              x1={getX(hoverIndex)}
              x2={getX(hoverIndex)}
              y1={padT}
              y2={padT + plotH}
              stroke="#0F172A"
              strokeWidth="1"
              strokeOpacity="0.25"
            />
            <circle
              cx={getX(hoverIndex)}
              cy={getY(combined[hoverIndex].real ?? combined[hoverIndex].trend)}
              r="4"
              fill={combined[hoverIndex].isForecast ? "#64748B" : "#0F766E"}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Interactive hover hit zones */}
        {combined.map((d, i) => {
          const stepW = plotW / Math.max(1, combined.length - 1);
          return (
            <rect
              key={`hit-${d.data}`}
              x={Math.max(padL, getX(i) - stepW / 2)}
              y={padT}
              width={stepW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}
      </svg>

      {/* Tooltip overlay */}
      {activePoint && hoverIndex !== null && (
        <div
          className="pointer-events-none absolute top-2 right-3 bg-slate-900 text-white px-3 py-2 rounded-md text-xs shadow-sm z-10 min-w-[205px]"
        >
          <div className="font-medium text-slate-200 mb-1 flex items-center justify-between gap-3">
            <span>{formatDateBR(activePoint.data)}</span>
            <span className="text-slate-400">
              {activePoint.isForecast ? "Projeção OLS" : "Histórico"}
            </span>
          </div>
          {activePoint.real !== null && (
            <div className="flex justify-between gap-4 font-mono tabular-nums">
              <span className="text-slate-300">Realizado:</span>
              <span className="font-semibold text-white">{formatMetricVal(activePoint.real)}</span>
            </div>
          )}
          {activePoint.ma7 !== null && (
            <div className="flex justify-between gap-4 font-mono tabular-nums">
              <span className="text-amber-300">Média Móvel 7d:</span>
              <span>{formatMetricVal(activePoint.ma7)}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 font-mono tabular-nums">
            <span className="text-slate-300">Tendência OLS:</span>
            <span>{formatMetricVal(activePoint.trend)}</span>
          </div>
          {activePoint.anomalias > 0 && (
            <div className="mt-1 pt-1 border-t border-slate-700 text-red-300 font-medium">
              {activePoint.anomalias} anomalia(s) detectada(s) neste dia
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-0.5 bg-teal-700" />
          <span>Consumo Realizado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-0.5 bg-amber-600" />
          <span>Média Móvel (7 dias)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3.5 h-0.5 border-t border-dashed border-slate-500" />
          <span>Tendência &amp; Previsão (OLS)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600" />
          <span>Anomalia Estatística (Z ≥ 1,5σ)</span>
        </div>
      </div>
    </div>
  );
};

interface UnitParetoChartProps {
  units: UnitParetoItem[];
}

export const UnitParetoChart: React.FC<UnitParetoChartProps> = ({ units }) => {
  if (units.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">Nenhuma unidade cadastrada.</p>;
  }

  const maxCost = Math.max(...units.map((u) => u.custo_total), 1);

  return (
    <div className="space-y-4">
      {units.map((u) => {
        const pct = Math.min(100, (u.custo_total / maxCost) * 100);
        const wastePct = u.custo_total > 0 ? Math.min(pct, (u.desperdicio_brl / maxCost) * 100) : 0;
        const hasRisk = u.anomalias > 0 || u.desvio_kwh_pct > 10 || u.desvio_m3_pct > 10;

        return (
          <div key={u.unidade_id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <div className="min-w-0">
                <span className="font-medium text-slate-900 truncate">{u.nome}</span>
                <span className="text-xs text-slate-500 ml-2">
                  {formatNumber(u.total_kwh, 0)} kWh · {formatNumber(u.total_m3, 1)} m³
                </span>
              </div>
              <div className="shrink-0 text-right font-mono tabular-nums text-xs">
                <span className="font-semibold text-slate-900">{formatBRL(u.custo_total)}</span>
                {u.desperdicio_brl > 0 && (
                  <span className={`ml-2 ${hasRisk ? "text-red-700" : "text-amber-700"}`}>
                    ({formatBRL(u.desperdicio_brl)} excesso)
                  </span>
                )}
              </div>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-sm overflow-hidden relative">
              <div
                className="h-full bg-teal-700 rounded-sm transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
              {wastePct > 0 && (
                <div
                  className="h-full bg-red-600/85 absolute top-0 right-0"
                  style={{
                    left: `${Math.max(0, pct - wastePct)}%`,
                    width: `${wastePct}%`,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="pt-2 flex items-center gap-5 text-xs text-slate-500 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-teal-700 inline-block rounded-xs" />
          Custo dentro da meta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-red-600/85 inline-block rounded-xs" />
          Parcela excedente (desperdício)
        </span>
      </div>
    </div>
  );
};

interface CorrelationScatterChartProps {
  points: ScatterPoint[];
  xAxis: "temperatura_c" | "ocupacao_pct";
}

export const CorrelationScatterChart: React.FC<CorrelationScatterChartProps> = ({
  points,
  xAxis,
}) => {
  const [hovered, setHovered] = useState<ScatterPoint | null>(null);

  if (points.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-slate-500">
        Sem pontos para análise de dispersão.
      </div>
    );
  }

  const width = 560;
  const height = 250;
  const padL = 52;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xs = points.map((p) => p[xAxis]);
  const ys = points.map((p) => p.consumo_kwh);
  const minX = Math.min(...xs) * 0.95;
  const maxX = Math.max(...xs) * 1.05;
  const minY = 0;
  const maxY = Math.max(...ys) * 1.12;

  const getX = (v: number) => padL + ((v - minX) / Math.max(0.01, maxX - minX)) * plotW;
  const getY = (v: number) => padT + plotH - ((v - minY) / Math.max(0.01, maxY - minY)) * plotH;

  // OLS line across scatter points
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const num = xs.reduce((acc, x, idx) => acc + (x - meanX) * (ys[idx] - meanY), 0);
  const den = xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0);
  const slope = den > 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;

  const x1 = minX;
  const y1 = Math.max(minY, Math.min(maxY, slope * x1 + intercept));
  const x2 = maxX;
  const y2 = Math.max(minY, Math.min(maxY, slope * x2 + intercept));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none"
        onMouseLeave={() => setHovered(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const val = minY + t * (maxY - minY);
          const y = getY(val);
          return (
            <g key={i}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono tabular-nums"
              >
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        <line
          x1={getX(x1)}
          y1={getY(y1)}
          x2={getX(x2)}
          y2={getY(y2)}
          stroke="#475569"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {points.map((pt) => {
          const fill =
            pt.status_anomalia === "Crítico"
              ? "#DC2626"
              : pt.status_anomalia === "Atenção"
                ? "#D97706"
                : "#0F766E";
          return (
            <circle
              key={pt.id}
              cx={getX(pt[xAxis])}
              cy={getY(pt.consumo_kwh)}
              r={hovered?.id === pt.id ? 5.5 : 3.5}
              fill={fill}
              fillOpacity={0.78}
              stroke="#FFFFFF"
              strokeWidth="1"
              onMouseEnter={() => setHovered(pt)}
              className="cursor-pointer"
            />
          );
        })}

        <text
          x={padL + plotW / 2}
          y={height - 6}
          textAnchor="middle"
          className="fill-slate-500 text-[11px]"
        >
          {xAxis === "temperatura_c" ? "Temperatura Ambiente (°C)" : "Taxa de Ocupação (%)"}
        </text>
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute top-2 right-2 bg-slate-900 text-white px-3 py-2 rounded-md text-xs shadow-sm">
          <div className="font-medium">{hovered.unidade_nome}</div>
          <div className="text-slate-300 font-mono tabular-nums">
            {formatDateBR(hovered.data_leitura)} · {formatNumber(hovered.consumo_kwh, 1)} kWh
          </div>
          <div className="text-slate-400 font-mono tabular-nums">
            {xAxis === "temperatura_c"
              ? `Temp: ${formatNumber(hovered.temperatura_c, 1)} °C`
              : `Ocupação: ${formatNumber(hovered.ocupacao_pct, 1)}%`}
          </div>
        </div>
      )}
    </div>
  );
};
