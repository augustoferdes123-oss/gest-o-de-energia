import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Leitura, Unidade } from "../types";
import { exportToCSV, formatBRL, formatDateBR, formatNumber } from "../utils/format";

interface LeiturasCrudViewProps {
  leituras: Leitura[];
  unidades: Unidade[];
  loading: boolean;
  onNew: () => void;
  onEdit: (leitura: Leitura) => void;
  onDelete: (leitura: Leitura) => void;
}

export const LeiturasCrudView: React.FC<LeiturasCrudViewProps> = ({
  leituras,
  unidades,
  loading,
  onNew,
  onEdit,
  onDelete,
}) => {
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = leituras.filter((r) => {
      if (unitFilter !== "all" && String(r.unidade_id) !== unitFilter) return false;
      if (statusFilter === "anomalies" && r.status_anomalia === "Normal") return false;
      if (
        statusFilter !== "all" &&
        statusFilter !== "anomalies" &&
        r.status_anomalia !== statusFilter
      ) {
        return false;
      }
      if (startDate && r.data_leitura < startDate) return false;
      if (endDate && r.data_leitura > endDate) return false;
      if (q) {
        const hay = `${r.unidade_nome} ${r.data_leitura} ${r.observacoes} ${r.tipo_anomalia}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const cmp = a.data_leitura.localeCompare(b.data_leitura) || a.id - b.id;
      return sortDesc ? -cmp : cmp;
    });
  }, [leituras, search, unitFilter, statusFilter, startDate, endDate, sortDesc]);

  const handleExport = () => {
    exportToCSV(
      "ecofluxo_leituras.csv",
      [
        "ID",
        "Unidade",
        "Data",
        "Consumo_kWh",
        "Consumo_m3",
        "Temp_C",
        "Ocupacao_pct",
        "Custo_BRL",
        "Z_Max",
        "Status",
        "Observacoes",
      ],
      filtered.map((r) => [
        r.id,
        r.unidade_nome,
        r.data_leitura,
        r.consumo_kwh,
        r.consumo_m3,
        r.temperatura_c,
        r.ocupacao_pct,
        r.custo_total,
        r.z_max,
        r.status_anomalia,
        r.observacoes,
      ])
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Registros de Consumo (CRUD)
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Cadastre, consulte, atualize e exclua medições armazenadas no banco SQLite3 com cálculo automático de Z-Score.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="h-10 px-3.5 inline-flex items-center gap-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={onNew}
            className="h-10 px-4 inline-flex items-center gap-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Leitura</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por unidade, data ou observação..."
              className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              aria-label="Filtrar por unidade"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <option value="all">Todas as Unidades</option>
              {unidades.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Data inicial"
              className="w-full h-10 px-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="md:col-span-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Data final"
              className="w-full h-10 px-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="md:col-span-1 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setUnitFilter("all");
                setStatusFilter("all");
                setStartDate("");
                setEndDate("");
              }}
              className="h-10 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              { id: "all", label: "Todos" },
              { id: "anomalies", label: "Somente Anomalias" },
              { id: "Crítico", label: "Crítico" },
              { id: "Atenção", label: "Atenção" },
              { id: "Normal", label: "Normal" },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === s.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 tabular-nums">
            <span>Exibindo {filtered.length} de {leituras.length} registros</span>
            <button
              type="button"
              onClick={() => setSortDesc((v) => !v)}
              className="font-medium text-slate-700 hover:text-slate-900 underline underline-offset-2"
            >
              Ordenar: {sortDesc ? "Mais recentes" : "Mais antigos"}
            </button>
          </div>
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Unidade</th>
                <th className="py-3 px-4 text-right">Energia (kWh)</th>
                <th className="py-3 px-4 text-right">Água (m³)</th>
                <th className="py-3 px-4 text-right">Temp / Ocup.</th>
                <th className="py-3 px-4 text-right">Custo</th>
                <th className="py-3 px-4 text-right">Z-Score</th>
                <th className="py-3 px-4">Diagnóstico</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={10} className="py-3.5 px-4">
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center">
                    <p className="text-sm text-slate-600 mb-3">
                      Nenhum registro encontrado com os filtros aplicados.
                    </p>
                    <button
                      type="button"
                      onClick={onNew}
                      className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800"
                    >
                      Cadastrar Primeiro Registro
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-500">
                      #{item.id}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                      {formatDateBR(item.data_leitura)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm">
                        {item.unidade_nome}
                      </div>
                      {item.observacoes && (
                        <div className="text-xs text-slate-500 truncate max-w-[230px]">
                          {item.observacoes}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatNumber(item.consumo_kwh, 1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                      {formatNumber(item.consumo_m3, 1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                      {formatNumber(item.temperatura_c, 1)}°C · {formatNumber(item.ocupacao_pct, 0)}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs font-medium text-slate-900 whitespace-nowrap">
                      {formatBRL(item.custo_total)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono tabular-nums text-xs font-medium whitespace-nowrap ${
                        item.z_max >= 2.2
                          ? "text-red-700"
                          : item.z_max >= 1.5
                            ? "text-amber-700"
                            : "text-slate-600"
                      }`}
                    >
                      {item.z_max >= 0 ? "+" : ""}
                      {formatNumber(item.z_max, 2)}σ
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {item.status_anomalia === "Normal" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Normal</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            item.status_anomalia === "Crítico" ? "text-red-700" : "text-amber-700"
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{item.status_anomalia} · {item.tipo_anomalia}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          title="Atualizar registro"
                          aria-label={`Editar leitura ${item.id}`}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          title="Excluir registro"
                          aria-label={`Excluir leitura ${item.id}`}
                          className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
