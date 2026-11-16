import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Droplets,
  Plus,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { ActionPlanStatus, ActiveTab, DashboardPayload, Leitura } from "../types";
import { formatBRL, formatDateBR, formatNumber } from "../utils/format";
import { TimeSeriesForecastChart, UnitParetoChart } from "./Charts";

interface DashboardViewProps {
  data: DashboardPayload;
  selectedUnitId: string;
  onSelectUnit: (id: string) => void;
  onNavigate: (tab: ActiveTab) => void;
  onOpenNewLeitura: () => void;
  onCreatePlanoFromAnomaly: (leitura: Leitura) => Promise<void>;
  onUpdatePlanoStatus: (id: number, status: ActionPlanStatus) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  selectedUnitId,
  onSelectUnit,
  onNavigate,
  onOpenNewLeitura,
  onCreatePlanoFromAnomaly,
  onUpdatePlanoStatus,
}) => {
  const [metric, setMetric] = useState<"custo" | "kwh" | "m3">("custo");
  const [creatingPlanFor, setCreatingPlanFor] = useState<number | null>(null);

  const { kpis, data_science, time_series, unit_pareto, top_anomalias, unidades, planos_acao } = data;

  const handleCreatePlan = async (leitura: Leitura) => {
    setCreatingPlanFor(leitura.id);
    try {
      await onCreatePlanoFromAnomaly(leitura);
    } finally {
      setCreatingPlanFor(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Problem & Solution Framing Header */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="text-xs font-medium text-teal-700">
              Solução Aplicada · Eficiência Predial e Combate ao Desperdício
            </div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight text-balance">
              Monitoramento Hídrico, Energético e Detecção Estatística de Anomalias
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Vazamentos ocultos e equipamentos operando fora do expediente geram até 25% de desperdício antes do fechamento da fatura. O motor Python analisa cada leitura via{" "}
              <span className="font-mono text-xs text-slate-800">Z-Score</span> e{" "}
              <span className="font-mono text-xs text-slate-800">Regressão Linear OLS</span> para antecipar custos e acionar correções imediatas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <select
              value={selectedUnitId}
              onChange={(e) => onSelectUnit(e.target.value)}
              aria-label="Filtrar painel por unidade"
              className="h-10 px-3 text-sm bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="all">Todas as Unidades ({unidades.length})</option>
              {unidades.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nome}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onOpenNewLeitura}
              className="h-10 px-4 inline-flex items-center gap-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Leitura</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Consumo Energético</span>
            <Zap className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {formatNumber(kpis.total_kwh, 0)} <span className="text-sm font-normal text-slate-500">kWh</span>
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            {kpis.total_registros} medições registradas · R² = {formatNumber(data_science.regressao_kwh.r2, 2)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Consumo Hídrico</span>
            <Droplets className="w-4 h-4 text-teal-700" />
          </div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {formatNumber(kpis.total_m3, 1)} <span className="text-sm font-normal text-slate-500">m³</span>
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            Equivalente a {formatNumber(kpis.total_m3 * 1000, 0)} litros no período
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Custo Acumulado &amp; Projeção 30d</span>
            <TrendingUp className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {formatBRL(kpis.custo_total_brl)}
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            Projeção próximos 30d: <span className="font-medium text-slate-800">{formatBRL(kpis.projecao_30d_brl)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Desperdício &amp; Anomalias</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-semibold text-red-700 font-mono tabular-nums">
            {formatBRL(kpis.desperdicio_brl)}
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            <span className="font-medium text-red-700">{kpis.anomalias_criticas} críticas</span>
            {" · "}
            <span>{kpis.anomalias_total} desvios totais</span>
          </div>
        </div>
      </section>

      {/* Main Chart: Time Series + Forecast */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Série Histórica, Média Móvel (7d) e Previsão Linear (14d)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cálculo via Regressão Linear OLS em Python · Pontos vermelhos sinalizam dias com anomalias (Z ≥ 1,5σ)
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
            {(
              [
                { key: "custo", label: "Custo (R$)" },
                { key: "kwh", label: "Energia (kWh)" },
                { key: "m3", label: "Água (m³)" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMetric(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  metric === tab.key
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <TimeSeriesForecastChart
            timeSeries={time_series}
            forecast={data_science.forecast_14d}
            metric={metric}
            showForecast
          />
        </div>
      </section>

      {/* Two-Column Breakdown: Pareto + Anomalies & Action Plans */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Pareto by Unit */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Custo &amp; Excesso por Unidade
              </h2>
              <p className="text-xs text-slate-500">Ranking de impacto financeiro e desvios de meta</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("unidades")}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Gerenciar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <UnitParetoChart units={unit_pareto} />
        </div>

        {/* Anomaly Diagnostics & Engineering Solutions */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Anomalias Detectadas &amp; Planos de Intervenção
              </h2>
              <p className="text-xs text-slate-500">
                Registros fora da curva normal (Z-Score) convertidos em ações corretivas
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("leituras")}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>Ver todos os registros</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {top_anomalias.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">
                Nenhuma anomalia estatística detectada para os filtros atuais.
              </div>
            ) : (
              top_anomalias.slice(0, 4).map((anom) => (
                <div
                  key={anom.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          anom.status_anomalia === "Crítico" ? "text-red-700" : "text-amber-700"
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{anom.status_anomalia}</span>
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-medium text-slate-900 truncate">{anom.unidade_nome}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {formatDateBR(anom.data_leitura)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-mono tabular-nums">
                      {anom.tipo_anomalia} (Z = +{formatNumber(anom.z_max, 2)}σ) ·{" "}
                      {formatNumber(anom.consumo_kwh, 1)} kWh · {formatNumber(anom.consumo_m3, 1)} m³ ·{" "}
                      {formatBRL(anom.custo_total)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCreatePlan(anom)}
                    disabled={creatingPlanFor === anom.id}
                    className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    {creatingPlanFor === anom.id ? "Gerando..." : "Gerar Plano de Ação"}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Action Plans List */}
          <div className="bg-slate-50/60 px-5 py-3 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Planos de Ação em Acompanhamento ({planos_acao.length})
            </div>
            <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-md">
              {planos_acao.slice(0, 4).map((plano) => (
                <div
                  key={plano.id}
                  className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{plano.titulo}</div>
                    <div className="text-slate-500">
                      {plano.unidade_nome} · {plano.categoria} · Economia estimada:{" "}
                      <span className="font-mono tabular-nums font-medium text-emerald-700">
                        {formatBRL(plano.impacto_estimado_brl)}/mês
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {plano.status === "Concluído" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Concluído</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{plano.status}</span>
                      </span>
                    )}
                    <select
                      value={plano.status}
                      aria-label={`Alterar status do plano ${plano.titulo}`}
                      onChange={(e) =>
                        onUpdatePlanoStatus(plano.id, e.target.value as ActionPlanStatus)
                      }
                      className="h-7 px-2 text-xs bg-white border border-slate-300 rounded-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em Execução">Em Execução</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
