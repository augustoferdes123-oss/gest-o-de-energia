import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Leitura, Unidade } from "../types";

interface LeituraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, editId?: number) => Promise<void>;
  unidades: Unidade[];
  editing: Leitura | null;
}

export const LeituraModal: React.FC<LeituraModalProps> = ({
  isOpen,
  onClose,
  onSave,
  unidades,
  editing,
}) => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [unidadeId, setUnidadeId] = useState<number>(unidades[0]?.id ?? 1);
  const [dataLeitura, setDataLeitura] = useState<string>(todayIso);
  const [consumoKwh, setConsumoKwh] = useState<string>("215");
  const [consumoM3, setConsumoM3] = useState<string>("14");
  const [temperaturaC, setTemperaturaC] = useState<string>("26.5");
  const [ocupacaoPct, setOcupacaoPct] = useState<string>("82");
  const [observacoes, setObservacoes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setUnidadeId(editing.unidade_id);
      setDataLeitura(editing.data_leitura);
      setConsumoKwh(String(editing.consumo_kwh));
      setConsumoM3(String(editing.consumo_m3));
      setTemperaturaC(String(editing.temperatura_c));
      setOcupacaoPct(String(editing.ocupacao_pct));
      setObservacoes(editing.observacoes || "");
    } else {
      setUnidadeId(unidades[0]?.id ?? 1);
      setDataLeitura(todayIso);
      setConsumoKwh("215");
      setConsumoM3("14");
      setTemperaturaC("26.5");
      setOcupacaoPct("82");
      setObservacoes("");
    }
    setError(null);
  }, [isOpen, editing, unidades, todayIso]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const kwh = Number(consumoKwh);
    const m3 = Number(consumoM3);
    const temp = Number(temperaturaC);
    const ocup = Number(ocupacaoPct);

    if (!unidadeId || !dataLeitura) {
      setError("Selecione a unidade e a data da leitura.");
      return;
    }
    if (Number.isNaN(kwh) || kwh < 0 || Number.isNaN(m3) || m3 < 0) {
      setError("Os valores de consumo devem ser números maiores ou iguais a zero.");
      return;
    }
    if (Number.isNaN(ocup) || ocup < 0 || ocup > 100) {
      setError("A taxa de ocupação deve estar entre 0% e 100%.");
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          unidade_id: Number(unidadeId),
          data_leitura: dataLeitura,
          consumo_kwh: kwh,
          consumo_m3: m3,
          temperatura_c: temp,
          ocupacao_pct: ocup,
          observacoes,
        },
        editing?.id
      );
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            {editing ? `Atualizar Leitura #${editing.id}` : "Cadastrar Nova Leitura"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            aria-label="Fechar janela"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Unidade / Setor
              </label>
              <select
                value={unidadeId}
                onChange={(e) => setUnidadeId(Number(e.target.value))}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Data da Medição
              </label>
              <input
                type="date"
                value={dataLeitura}
                onChange={(e) => setDataLeitura(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Consumo Elétrico (kWh)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={consumoKwh}
                onChange={(e) => setConsumoKwh(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Consumo Hídrico (m³)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={consumoM3}
                onChange={(e) => setConsumoM3(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Temperatura Ambiente (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={temperaturaC}
                onChange={(e) => setTemperaturaC(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Taxa de Ocupação (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={ocupacaoPct}
                onChange={(e) => setOcupacaoPct(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Observações Operacionais
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex.: Manutenção preventiva, equipamento ligado após expediente..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 transition-colors"
            >
              {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Cadastrar Registro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
