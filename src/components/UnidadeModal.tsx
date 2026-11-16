import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Unidade } from "../types";

interface UnidadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>, editId?: number) => Promise<void>;
  editing: Unidade | null;
}

export const UnidadeModal: React.FC<UnidadeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editing,
}) => {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("Administrativo");
  const [areaM2, setAreaM2] = useState("500");
  const [metaKwhDia, setMetaKwhDia] = useState("200");
  const [metaM3Dia, setMetaM3Dia] = useState("12");
  const [tarifaKwh, setTarifaKwh] = useState("0.92");
  const [tarifaM3, setTarifaM3] = useState("8.40");
  const [responsavel, setResponsavel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setNome(editing.nome);
      setTipo(editing.tipo);
      setAreaM2(String(editing.area_m2));
      setMetaKwhDia(String(editing.meta_kwh_dia));
      setMetaM3Dia(String(editing.meta_m3_dia));
      setTarifaKwh(String(editing.tarifa_kwh));
      setTarifaM3(String(editing.tarifa_m3));
      setResponsavel(editing.responsavel);
    } else {
      setNome("");
      setTipo("Administrativo");
      setAreaM2("500");
      setMetaKwhDia("200");
      setMetaM3Dia("12");
      setTarifaKwh("0.92");
      setTarifaM3("8.40");
      setResponsavel("");
    }
    setError(null);
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nome.trim() || !responsavel.trim()) {
      setError("Informe o nome da unidade e o responsável técnico.");
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          nome: nome.trim(),
          tipo,
          area_m2: Number(areaM2),
          meta_kwh_dia: Number(metaKwhDia),
          meta_m3_dia: Number(metaM3Dia),
          tarifa_kwh: Number(tarifaKwh),
          tarifa_m3: Number(tarifaM3),
          responsavel: responsavel.trim(),
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
            {editing ? `Editar Unidade: ${editing.nome}` : "Cadastrar Nova Unidade"}
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nome da Unidade / Setor
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Laboratório de Química"
                required
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Categoria Operacional
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="Administrativo">Administrativo</option>
                <option value="Tecnologia">Tecnologia</option>
                <option value="Alimentação">Alimentação</option>
                <option value="Logística">Logística</option>
                <option value="Acadêmico">Acadêmico</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Responsável Técnico
              </label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Nome completo"
                required
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Área Construída (m²)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={areaM2}
                onChange={(e) => setAreaM2(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Meta Diária Energia (kWh)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={metaKwhDia}
                onChange={(e) => setMetaKwhDia(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Meta Diária Água (m³)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={metaM3Dia}
                onChange={(e) => setMetaM3Dia(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Tarifa Energia (R$/kWh)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={tarifaKwh}
                onChange={(e) => setTarifaKwh(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Tarifa Água (R$/m³)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={tarifaM3}
                onChange={(e) => setTarifaM3(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
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
              {saving ? "Salvando..." : editing ? "Salvar Alterações" : "Cadastrar Unidade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
