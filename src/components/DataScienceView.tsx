import React, { useState } from "react";
import { AlertTriangle, Calculator, LineChart, Sliders } from "lucide-react";
import type { DashboardPayload } from "../types";
import { formatBRL, formatDateBR, formatNumber } from "../utils/format";
import { CorrelationScatterChart } from "./Charts";

interface DataScienceViewProps {
  data: DashboardPayload;
}

export const DataScienceView: React.FC<DataScienceViewProps> = ({ data }) => {
  const [scatterAxis, setScatterAxis] = useState<"temperatura_c" | "ocupacao_pct">("temperatura_c");
  const [mitigationPct, setMitigationPct] = useState<number>(80);

  const { kpis, data_science, top_anomalias } = data;
  const { regressao_kwh, regressao_m3, regressao_custo, correlacao_temp_kwh, correlacao_ocup_kwh, forecast_14d, scatter_points } =
    data_science;

  const monthlySavings = (kpis.desperdicio_brl * (mitigationPct / 100));
  const annualSavings = monthlySavings * 12;
  const co2SavedKg = kpis.co2_evitavel_kg * (mitigationPct / 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          Ciência de Dados &amp; Modelos Estatísticos (Python)
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Indicadores calculados em tempo real pelo módulo <span className="font-mono text-xs text-slate-800">python/engine.py</span> com regressão linear OLS, correlação de Pearson e detecção de outliers por Z-Score.
        </p>
      </div>

      {/* Regression & Correlation Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Regressão Linear · Custo Diário</span>
            <LineChart className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-lg font-mono font-semibold text-slate-900 tabular-nums">
            y = {regressao_custo.slope >= 0 ? "+" : ""}
            {formatNumber(regressao_custo.slope, 2)}x + {formatNumber(regressao_custo.intercept, 1)}
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            Coeficiente R² = <span className="font-mono font-semibold">{formatNumber(regressao_custo.r2, 3)}</span> ·{" "}
            {regressao_custo.slope > 0 ? "Tendência de alta nos custos" : "Tendência estável ou de queda"}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Correlação de Pearson (r)</span>
            <Calculator className="w-4 h-4 text-teal-700" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="text-xs text-slate-500">Temp. vs kWh</div>
              <div className="text-lg font-mono font-semibold text-slate-900 tabular-nums">
                r = {correlacao_temp_kwh >= 0 ? "+" : ""}
                {formatNumber(correlacao_temp_kwh, 3)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Ocupação vs kWh</div>
              <div className="text-lg font-mono font-semibold text-slate-900 tabular-nums">
                r = {correlacao_ocup_kwh >= 0 ? "+" : ""}
                {formatNumber(correlacao_ocup_kwh, 3)}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Mede o grau de dependência linear entre clima/uso e demanda elétrica.
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Regressão Energia &amp; Água</span>
            <LineChart className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xs font-mono tabular-nums space-y-1.5 pt-1 text-slate-800">
            <div className="flex justify-between">
              <span>Inclinação kWh/dia:</span>
              <span className="font-semibold">
                {regressao_kwh.slope >= 0 ? "+" : ""}
                {formatNumber(regressao_kwh.slope, 2)} kWh
              </span>
            </div>
            <div className="flex justify-between">
              <span>Inclinação Água/dia:</span>
              <span className="font-semibold">
                {regressao_m3.slope >= 0 ? "+" : ""}
                {formatNumber(regressao_m3.slope, 2)} m³
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Limite Z-Score Crítico:</span>
              <span>Z ≥ +2,20σ</span>
            </div>
          </div>
        </div>
      </section>

      {/* Scatter Plot + Savings Simulator */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Análise de Dispersão &amp; Regressão
              </h2>
              <p className="text-xs text-slate-500">
                Relação entre variáveis ambientais/operacionais e consumo elétrico (kWh)
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setScatterAxis("temperatura_c")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  scatterAxis === "temperatura_c"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Temperatura (°C)
              </button>
              <button
                type="button"
                onClick={() => setScatterAxis("ocupacao_pct")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  scatterAxis === "ocupacao_pct"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ocupação (%)
              </button>
            </div>
          </div>

          <CorrelationScatterChart points={scatter_points} xAxis={scatterAxis} />
        </div>

        {/* Simulador de Economia */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-teal-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Simulador de Impacto da Solução
              </h2>
              <p className="text-xs text-slate-500">
                Estime o retorno financeiro ao corrigir as anomalias detectadas
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-700">Taxa de mitigação dos desvios</span>
              <span className="font-mono tabular-nums text-teal-700 text-sm font-semibold">
                {mitigationPct}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={mitigationPct}
              onChange={(e) => setMitigationPct(Number(e.target.value))}
              className="w-full accent-teal-700 cursor-pointer"
              aria-label="Percentual de mitigação de desperdício"
            />
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-slate-50/50">
            <div className="px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">Economia no ciclo analisado</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-700">
                {formatBRL(monthlySavings)}
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">Projeção de economia anual</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatBRL(annualSavings)}
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">Emissões de CO₂ evitadas</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatNumber(co2SavedKg, 1)} kg CO₂
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Baseado no desperdício calculado de{" "}
            <span className="font-mono font-medium text-slate-700">
              {formatBRL(kpis.desperdicio_brl)}
            </span>{" "}
            sobre as metas diárias das unidades monitoradas.
          </p>
        </div>
      </section>

      {/* Forecast Table + Z-Score Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Previsão de Demanda — Próximos 14 Dias (OLS)
            </h2>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Data Prevista</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Energia (kWh)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Água (m³)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Custo Previsto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {forecast_14d.map((f) => (
                  <tr key={f.data} className="hover:bg-slate-50">
                    <td className="py-2 px-4 text-slate-700">{formatDateBR(f.data)}</td>
                    <td className="py-2 px-4 text-right text-slate-900">
                      {formatNumber(f.kwh_previsto, 1)}
                    </td>
                    <td className="py-2 px-4 text-right text-slate-900">
                      {formatNumber(f.m3_previsto, 1)}
                    </td>
                    <td className="py-2 px-4 text-right font-medium text-teal-800">
                      {formatBRL(f.custo_previsto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Top Outliers Identificados por Z-Score
            </h2>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Data · Unidade</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Z (kWh)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Z (m³)</th>
                  <th className="py-2.5 px-4 font-semibold">Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {top_anomalias.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Nenhuma anomalia encontrada.
                    </td>
                  </tr>
                ) : (
                  top_anomalias.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-2 px-4">
                        <div className="font-medium text-slate-900">{a.unidade_nome}</div>
                        <div className="text-slate-500 font-mono tabular-nums">
                          {formatDateBR(a.data_leitura)}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-700">
                        {a.z_kwh >= 0 ? "+" : ""}
                        {formatNumber(a.z_kwh, 2)}σ
                      </td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-700">
                        {a.z_m3 >= 0 ? "+" : ""}
                        {formatNumber(a.z_m3, 2)}σ
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            a.status_anomalia === "Crítico" ? "text-red-700" : "text-amber-700"
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{a.tipo_anomalia}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
