import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  Database,
  LayoutDashboard,
  Menu,
  Plus,
  Table2,
  X,
} from "lucide-react";
import type {
  ActionPlanStatus,
  ActiveTab,
  DashboardPayload,
  Leitura,
  Unidade,
} from "./types";
import { DashboardView } from "./components/DashboardView";
import { LeiturasCrudView } from "./components/LeiturasCrudView";
import { UnidadesCrudView } from "./components/UnidadesCrudView";
import { DataScienceView } from "./components/DataScienceView";
import { DatabasePythonView } from "./components/DatabasePythonView";
import { LeituraModal } from "./components/LeituraModal";
import { UnidadeModal } from "./components/UnidadeModal";
import { ConfirmModal } from "./components/ConfirmModal";

const NAV_ITEMS: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
  { id: "leituras", label: "Registros (CRUD)", icon: Table2 },
  { id: "unidades", label: "Unidades", icon: Building2 },
  { id: "datascience", label: "Ciência de Dados", icon: BarChart3 },
  { id: "database", label: "Banco & Python", icon: Database },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [selectedUnitId, setSelectedUnitId] = useState<string>("all");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals state
  const [leituraModalOpen, setLeituraModalOpen] = useState(false);
  const [editingLeitura, setEditingLeitura] = useState<Leitura | null>(null);

  const [unidadeModalOpen, setUnidadeModalOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "leitura"; item: Leitura }
    | { kind: "unidade"; item: Unidade }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  }, []);

  const loadAll = useCallback(async (unitId = selectedUnitId) => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, leitRes] = await Promise.all([
        fetch(`/api/dashboard?unidade_id=${encodeURIComponent(unitId)}`),
        fetch("/api/leituras"),
      ]);
      if (!dashRes.ok) {
        const errJson = await dashRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Falha ao carregar painel Python/SQLite");
      }
      if (!leitRes.ok) {
        const errJson = await leitRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Falha ao carregar registros");
      }
      const dashData = (await dashRes.json()) as DashboardPayload;
      const leitData = (await leitRes.json()) as { leituras: Leitura[] };
      setDashboard(dashData);
      setLeituras(leitData.leituras);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedUnitId]);

  useEffect(() => {
    loadAll(selectedUnitId);
  }, [loadAll, selectedUnitId]);

  const handleSaveLeitura = async (payload: Record<string, unknown>, editId?: number) => {
    const url = editId ? `/api/leituras/${editId}` : "/api/leituras";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Erro ao salvar leitura");
    await loadAll(selectedUnitId);
    showToast(editId ? "Registro atualizado no SQLite." : "Novo registro salvo no SQLite.");
  };

  const handleSaveUnidade = async (payload: Record<string, unknown>, editId?: number) => {
    const url = editId ? `/api/unidades/${editId}` : "/api/unidades";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Erro ao salvar unidade");
    await loadAll(selectedUnitId);
    showToast(editId ? "Unidade atualizada com sucesso." : "Unidade cadastrada com sucesso.");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const url =
        deleteTarget.kind === "leitura"
          ? `/api/leituras/${deleteTarget.item.id}`
          : `/api/unidades/${deleteTarget.item.id}`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao excluir registro");
      if (
        deleteTarget.kind === "unidade" &&
        selectedUnitId === String(deleteTarget.item.id)
      ) {
        setSelectedUnitId("all");
      } else {
        await loadAll(selectedUnitId);
      }
      showToast(
        deleteTarget.kind === "leitura"
          ? `Leitura #${deleteTarget.item.id} excluída.`
          : `Unidade "${deleteTarget.item.nome}" excluída.`
      );
      setDeleteTarget(null);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreatePlanoFromAnomaly = async (leitura: Leitura) => {
    const isWater = leitura.tipo_anomalia.toLowerCase().includes("hídrica");
    const titulo = isWater
      ? `Vistoria de vazamento na rede hídrica (${leitura.data_leitura})`
      : `Auditoria de carga elétrica fora do padrão (${leitura.data_leitura})`;
    const excesso =
      Math.max(0, leitura.consumo_kwh - leitura.meta_kwh_dia) * leitura.tarifa_kwh +
      Math.max(0, leitura.consumo_m3 - leitura.meta_m3_dia) * leitura.tarifa_m3;
    const impacto = Math.max(250, Math.round(excesso * 12));

    const res = await fetch("/api/planos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unidade_id: leitura.unidade_id,
        titulo,
        categoria: isWater ? "Vazamento Hídrico" : "Pico Energético",
        impacto_estimado_brl: impacto,
        status: "Pendente",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast(json.error || "Erro ao gerar plano", "error");
      return;
    }
    await loadAll(selectedUnitId);
    showToast("Plano de ação registrado no banco de dados.");
  };

  const handleUpdatePlanoStatus = async (id: number, status: ActionPlanStatus) => {
    const res = await fetch(`/api/planos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      showToast("Erro ao atualizar plano de ação", "error");
      return;
    }
    await loadAll(selectedUnitId);
    showToast(`Status atualizado para "${status}".`);
  };

  const handleResetDemo = async () => {
    const res = await fetch("/api/reset-demo", { method: "POST" });
    if (!res.ok) {
      showToast("Falha ao restaurar dados iniciais", "error");
      return;
    }
    setSelectedUnitId("all");
    await loadAll("all");
    showToast("Base de demonstração restaurada com 180 leituras.");
  };

  const activeNavLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? "Visão Geral";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200 z-30">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("overview");
            }}
            className="flex items-center gap-2.5 text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <Activity className="w-5 h-5 text-teal-700" />
            <span>EcoFluxo</span>
          </a>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-teal-700" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-700">Arquitetura Integrada</div>
          <div>Python 3 · SQLite3 · Regressão OLS</div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-full bg-white h-full border-r border-slate-200 flex flex-col z-50">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="flex items-center gap-2 text-lg font-display font-bold text-slate-900">
                <Activity className="w-5 h-5 text-teal-700" />
                <span>EcoFluxo</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                      active
                        ? "bg-teal-50 text-teal-800"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-md"
              aria-label="Abrir navegação"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
              <span className="font-medium text-slate-700">EcoFluxo</span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">{activeNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingLeitura(null);
                setLeituraModalOpen(true);
              }}
              className="h-9 px-3.5 inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Leitura</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1320px] w-full mx-auto">
          {error ? (
            <div className="bg-white border border-red-200 rounded-lg p-6 text-center space-y-3">
              <div className="text-sm font-semibold text-red-700">
                Erro ao comunicar com o motor Python / SQLite
              </div>
              <p className="text-xs text-slate-600">{error}</p>
              <button
                type="button"
                onClick={() => loadAll(selectedUnitId)}
                className="px-4 py-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800"
              >
                Tentar novamente
              </button>
            </div>
          ) : loading && !dashboard ? (
            <div className="space-y-4">
              <div className="h-28 bg-white border border-slate-200 rounded-lg animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} className="h-28 bg-white border border-slate-200 rounded-lg animate-pulse" />
                ))}
              </div>
              <div className="h-80 bg-white border border-slate-200 rounded-lg animate-pulse" />
            </div>
          ) : dashboard ? (
            <>
              {activeTab === "overview" && (
                <DashboardView
                  data={dashboard}
                  selectedUnitId={selectedUnitId}
                  onSelectUnit={setSelectedUnitId}
                  onNavigate={setActiveTab}
                  onOpenNewLeitura={() => {
                    setEditingLeitura(null);
                    setLeituraModalOpen(true);
                  }}
                  onCreatePlanoFromAnomaly={handleCreatePlanoFromAnomaly}
                  onUpdatePlanoStatus={handleUpdatePlanoStatus}
                />
              )}

              {activeTab === "leituras" && (
                <LeiturasCrudView
                  leituras={leituras}
                  unidades={dashboard.unidades}
                  loading={loading}
                  onNew={() => {
                    setEditingLeitura(null);
                    setLeituraModalOpen(true);
                  }}
                  onEdit={(item) => {
                    setEditingLeitura(item);
                    setLeituraModalOpen(true);
                  }}
                  onDelete={(item) => setDeleteTarget({ kind: "leitura", item })}
                />
              )}

              {activeTab === "unidades" && (
                <UnidadesCrudView
                  unidades={dashboard.unidades}
                  pareto={dashboard.unit_pareto}
                  onNew={() => {
                    setEditingUnidade(null);
                    setUnidadeModalOpen(true);
                  }}
                  onEdit={(item) => {
                    setEditingUnidade(item);
                    setUnidadeModalOpen(true);
                  }}
                  onDelete={(item) => setDeleteTarget({ kind: "unidade", item })}
                />
              )}

              {activeTab === "datascience" && <DataScienceView data={dashboard} />}

              {activeTab === "database" && (
                <DatabasePythonView onResetDemo={handleResetDemo} />
              )}
            </>
          ) : null}
        </main>
      </div>

      {/* Modals */}
      <LeituraModal
        isOpen={leituraModalOpen}
        onClose={() => {
          setLeituraModalOpen(false);
          setEditingLeitura(null);
        }}
        onSave={handleSaveLeitura}
        unidades={dashboard?.unidades ?? []}
        editing={editingLeitura}
      />

      <UnidadeModal
        isOpen={unidadeModalOpen}
        onClose={() => {
          setUnidadeModalOpen(false);
          setEditingUnidade(null);
        }}
        onSave={handleSaveUnidade}
        editing={editingUnidade}
      />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title={
          deleteTarget?.kind === "leitura"
            ? `Excluir leitura #${deleteTarget.item.id}`
            : `Excluir unidade "${deleteTarget?.item.nome ?? ""}"`
        }
        description={
          deleteTarget?.kind === "leitura"
            ? "Esta ação removerá permanentemente o registro do banco de dados SQLite e recalculará os indicadores estatísticos."
            : "A exclusão desta unidade removerá também todas as leituras e planos de ação vinculados a ela (ON DELETE CASCADE)."
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {/* Feedback Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-md text-xs font-medium shadow-md border ${
            toast.type === "error"
              ? "bg-red-700 text-white border-red-800"
              : "bg-slate-900 text-white border-slate-800"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
