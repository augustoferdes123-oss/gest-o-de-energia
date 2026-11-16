import React from "react";
import { Building2, Edit3, Plus, Trash2 } from "lucide-react";
import type { UnitParetoItem, Unidade } from "../types";
import { formatBRL, formatNumber } from "../utils/format";

interface UnidadesCrudViewProps {
  unidades: Unidade[];
  pareto: UnitParetoItem[];
  onNew: () => void;
  onEdit: (unidade: Unidade) => void;
  onDelete: (unidade: Unidade) => void;
}

export const UnidadesCrudView: React.FC<UnidadesCrudViewProps> = ({
  unidades,
  pareto,
  onNew,
  onEdit,
  onDelete,
}) => {
  const paretoMap = new Map(pareto.map((p) => [p.unidade_id, p]));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Unidades &amp; Parâmetros Tarifários
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Gerencie edificações, metas diárias de consumo (kWh e m³) e tarifas locais na tabela relacional <span className="font-mono text-xs text-slate-800">unidades</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={onNew}
          className="h-10 px-4 inline-flex items-center gap-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Unidade</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Unidade / Responsável</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4 text-right">Área (m²)</th>
                <th className="py-3 px-4 text-right">Meta kWh/dia</th>
                <th className="py-3 px-4 text-right">Meta m³/dia</th>
                <th className="py-3 px-4 text-right">Tarifas (R$)</th>
                <th className="py-3 px-4 text-right">Custo Total</th>
                <th className="py-3 px-4 text-right">Desvio Meta</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {unidades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 px-4 text-center text-slate-500">
                    Nenhuma unidade cadastrada. Clique em &quot;Nova Unidade&quot; para iniciar.
                  </td>
                </tr>
              ) : (
                unidades.map((u) => {
                  const stats = paretoMap.get(u.id);
                  const maxDesvio = stats
                    ? Math.max(stats.desvio_kwh_pct, stats.desvio_m3_pct)
                    : 0;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <div className="font-medium text-slate-900">{u.nome}</div>
                            <div className="text-xs text-slate-500">Resp.: {u.responsavel}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">{u.tipo}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                        {formatNumber(u.area_m2, 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                        {formatNumber(u.meta_kwh_dia, 1)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-900">
                        {formatNumber(u.meta_m3_dia, 1)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {formatBRL(u.tarifa_kwh)}/kWh · {formatBRL(u.tarifa_m3)}/m³
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-medium text-slate-900 whitespace-nowrap">
                        {stats ? formatBRL(stats.custo_total) : "R$ 0,00"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums text-xs font-medium whitespace-nowrap ${
                          maxDesvio > 10
                            ? "text-red-700"
                            : maxDesvio > 0
                              ? "text-amber-700"
                              : "text-emerald-700"
                        }`}
                      >
                        {stats
                          ? `${maxDesvio >= 0 ? "+" : ""}${formatNumber(maxDesvio, 1)}%`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEdit(u)}
                            title="Editar unidade"
                            aria-label={`Editar unidade ${u.nome}`}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(u)}
                            title="Excluir unidade"
                            aria-label={`Excluir unidade ${u.nome}`}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
