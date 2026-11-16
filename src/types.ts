export type AnomalyStatus = "Normal" | "Atenção" | "Crítico";
export type ActionPlanStatus = "Pendente" | "Em Execução" | "Concluído";

export interface Unidade {
  id: number;
  nome: string;
  tipo: string;
  area_m2: number;
  meta_kwh_dia: number;
  meta_m3_dia: number;
  tarifa_kwh: number;
  tarifa_m3: number;
  responsavel: string;
  criado_em?: string;
  total_leituras?: number;
  media_kwh?: number;
  media_m3?: number;
}

export interface Leitura {
  id: number;
  unidade_id: number;
  unidade_nome: string;
  unidade_tipo: string;
  area_m2: number;
  meta_kwh_dia: number;
  meta_m3_dia: number;
  tarifa_kwh: number;
  tarifa_m3: number;
  data_leitura: string;
  consumo_kwh: number;
  consumo_m3: number;
  temperatura_c: number;
  ocupacao_pct: number;
  observacoes: string;
  criado_em: string;
  z_kwh: number;
  z_m3: number;
  z_max: number;
  custo_total: number;
  status_anomalia: AnomalyStatus;
  tipo_anomalia: string;
}

export interface PlanoAcao {
  id: number;
  unidade_id: number;
  unidade_nome: string;
  titulo: string;
  categoria: string;
  impacto_estimado_brl: number;
  status: ActionPlanStatus;
  criado_em: string;
}

export interface TimeSeriesPoint {
  data: string;
  kwh: number;
  m3: number;
  custo: number;
  meta_kwh: number;
  meta_m3: number;
  anomalias: number;
  ma7_kwh: number;
  ma7_m3: number;
  ma7_custo: number;
  trend_kwh: number;
  trend_m3: number;
  trend_custo: number;
}

export interface ForecastPoint {
  data: string;
  kwh_previsto: number;
  m3_previsto: number;
  custo_previsto: number;
}

export interface RegressionStats {
  slope: number;
  intercept: number;
  r2: number;
}

export interface UnitParetoItem {
  unidade_id: number;
  nome: string;
  tipo: string;
  dias: number;
  total_kwh: number;
  total_m3: number;
  meta_total_kwh: number;
  meta_total_m3: number;
  custo_total: number;
  desperdicio_brl: number;
  desvio_kwh_pct: number;
  desvio_m3_pct: number;
  intensidade_kwh_m2: number;
  anomalias: number;
}

export interface ScatterPoint {
  id: number;
  unidade_nome: string;
  data_leitura: string;
  temperatura_c: number;
  ocupacao_pct: number;
  consumo_kwh: number;
  consumo_m3: number;
  status_anomalia: AnomalyStatus;
}

export interface DashboardPayload {
  kpis: {
    total_registros: number;
    total_unidades: number;
    total_kwh: number;
    total_m3: number;
    custo_total_brl: number;
    desperdicio_brl: number;
    economia_potencial_brl: number;
    anomalias_total: number;
    anomalias_criticas: number;
    projecao_30d_brl: number;
    co2_evitavel_kg: number;
  };
  data_science: {
    regressao_kwh: RegressionStats;
    regressao_m3: RegressionStats;
    regressao_custo: RegressionStats;
    correlacao_temp_kwh: number;
    correlacao_ocup_kwh: number;
    forecast_14d: ForecastPoint[];
    scatter_points: ScatterPoint[];
  };
  time_series: TimeSeriesPoint[];
  unit_pareto: UnitParetoItem[];
  top_anomalias: Leitura[];
  unidades: Unidade[];
  planos_acao: PlanoAcao[];
}

export type ActiveTab = "overview" | "leituras" | "unidades" | "datascience" | "database";
