import React, { useEffect, useState } from "react";
import { Code2, Database, Download, Play, RotateCcw } from "lucide-react";

interface SqlResult {
  columns: string[];
  rows: (string | number | null)[][];
  elapsed_ms: number;
  row_count: number;
}

interface DatabasePythonViewProps {
  onResetDemo: () => Promise<void>;
}

const PRESET_QUERIES = [
  {
    label: "Média e Total por Unidade",
    sql: `SELECT u.nome AS unidade,
       COUNT(l.id) AS qtd_leituras,
       ROUND(AVG(l.consumo_kwh), 1) AS media_kwh,
       ROUND(u.meta_kwh_dia, 1) AS meta_kwh,
       ROUND(AVG(l.consumo_m3), 1) AS media_m3,
       ROUND(u.meta_m3_dia, 1) AS meta_m3
FROM unidades u
LEFT JOIN leituras l ON l.unidade_id = u.id
GROUP BY u.id
ORDER BY media_kwh DESC;`,
  },
  {
    label: "Top 10 Leituras de Maior Custo",
    sql: `SELECT l.data_leitura,
       u.nome AS unidade,
       l.consumo_kwh,
       l.consumo_m3,
       ROUND(l.consumo_kwh * u.tarifa_kwh + l.consumo_m3 * u.tarifa_m3, 2) AS custo_brl
FROM leituras l
JOIN unidades u ON u.id = l.unidade_id
ORDER BY custo_brl DESC
LIMIT 10;`,
  },
  {
    label: "Planos de Ação e Economia",
    sql: `SELECT p.id,
       u.nome AS unidade,
       p.titulo,
       p.categoria,
       p.impacto_estimado_brl,
       p.status
FROM planos_acao p
JOIN unidades u ON u.id = p.unidade_id
ORDER BY p.impacto_estimado_brl DESC;`,
  },
];

export const DatabasePythonView: React.FC<DatabasePythonViewProps> = ({ onResetDemo }) => {
  const [query, setQuery] = useState(PRESET_QUERIES[0].sql);
  const [sqlResult, setSqlResult] = useState<SqlResult | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [runningSql, setRunningSql] = useState(false);

  const [activeCodeFile, setActiveCodeFile] = useState<"engine" | "desktop">("engine");
  const [sources, setSources] = useState<{ engineCode: string; desktopCode: string } | null>(null);
  const [resetting, setResetting] = useState(false);

  const executeSql = async (sqlToRun = query) => {
    setRunningSql(true);
    setSqlError(null);
    try {
      const res = await fetch("/api/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlToRun }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao executar SQL");
      setSqlResult(json);
    } catch (err) {
      setSqlError((err as Error).message);
      setSqlResult(null);
    } finally {
      setRunningSql(false);
    }
  };

  useEffect(() => {
    executeSql(PRESET_QUERIES[0].sql);
    fetch("/api/python-source")
      .then((r) => r.json())
      .then((d) => setSources(d))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadPythonFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/x-python;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await onResetDemo();
      await executeSql(query);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Banco de Dados Relacional (SQLite3) &amp; Código Python
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Inspecione o esquema relacional, execute consultas SQL reais no banco <span className="font-mono text-xs text-slate-800">data/ecofluxo.db</span> e baixe os módulos Python.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="h-10 px-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{resetting ? "Restaurando..." : "Restaurar Base Inicial"}</span>
        </button>
      </div>

      {/* Relational Schema Summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Database className="w-4 h-4 text-teal-700" />
            <span className="font-mono">unidades</span>
          </div>
          <p className="text-xs text-slate-600">
            Armazena os setores monitorados, área (m²), metas diárias e tarifas unitárias.
          </p>
          <div className="text-xs font-mono text-slate-500 pt-1 border-t border-slate-100">
            PK: id · nome (UNIQUE), tipo, area_m2, meta_kwh_dia, meta_m3_dia, tarifa_kwh, tarifa_m3
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Database className="w-4 h-4 text-teal-700" />
            <span className="font-mono">leituras</span>
          </div>
          <p className="text-xs text-slate-600">
            Série histórica diária de energia, água, temperatura e ocupação vinculada às unidades.
          </p>
          <div className="text-xs font-mono text-slate-500 pt-1 border-t border-slate-100">
            PK: id · FK: unidade_id → unidades(id) ON DELETE CASCADE
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Database className="w-4 h-4 text-teal-700" />
            <span className="font-mono">planos_acao</span>
          </div>
          <p className="text-xs text-slate-600">
            Ações corretivas vinculadas às anomalias detectadas, com impacto estimado em R$/mês.
          </p>
          <div className="text-xs font-mono text-slate-500 pt-1 border-t border-slate-100">
            PK: id · FK: unidade_id → unidades(id), status, impacto_estimado_brl
          </div>
        </div>
      </section>

      {/* Live SQL Console */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Console SQL Interativo (Executado via Python sqlite3)
            </h2>
            <p className="text-xs text-slate-500">
              Execute consultas SELECT, WITH ou PRAGMA diretamente sobre o banco SQLite em disco.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_QUERIES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setQuery(preset.sql);
                  executeSql(preset.sql);
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-3 bg-slate-50/50">
          <textarea
            rows={5}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-3 text-xs font-mono bg-slate-900 text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            spellCheck={false}
          />
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500 font-mono">
              {sqlResult
                ? `${sqlResult.row_count} linha(s) retornada(s) em ${sqlResult.elapsed_ms} ms`
                : "Pronto para consultar"}
            </span>
            <button
              type="button"
              onClick={() => executeSql(query)}
              disabled={runningSql}
              className="h-9 px-4 inline-flex items-center gap-2 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-60 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{runningSql ? "Executando..." : "Executar SQL"}</span>
            </button>
          </div>
        </div>

        {sqlError && (
          <div className="mx-4 mb-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">
            {sqlError}
          </div>
        )}

        {sqlResult && sqlResult.columns.length > 0 && (
          <div className="overflow-x-auto border-t border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-mono">
                <tr>
                  {sqlResult.columns.map((col) => (
                    <th key={col} className="py-2.5 px-4 font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {sqlResult.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-4 text-slate-800 whitespace-nowrap">
                        {cell === null ? "NULL" : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Python Source Code Viewer & Download */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-teal-700" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Código-Fonte Python 3 (Motor Ativo &amp; Versão Desktop Tkinter)
              </h2>
              <p className="text-xs text-slate-500">
                Visualize ou baixe os scripts Python que integram SQLite3, Ciência de Dados e interface gráfica.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveCodeFile("engine")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeCodeFile === "engine"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                python/engine.py
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeFile("desktop")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeCodeFile === "desktop"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ecofluxo_desktop.py
              </button>
            </div>

            {sources && (
              <button
                type="button"
                onClick={() =>
                  downloadPythonFile(
                    activeCodeFile === "engine" ? "engine.py" : "ecofluxo_desktop.py",
                    activeCodeFile === "engine" ? sources.engineCode : sources.desktopCode
                  )
                }
                className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar .py</span>
              </button>
            )}
          </div>
        </div>

        <pre className="p-4 text-xs font-mono bg-slate-900 text-slate-200 overflow-x-auto max-h-96 leading-relaxed">
          {sources
            ? activeCodeFile === "engine"
              ? sources.engineCode
              : sources.desktopCode
            : "Carregando código-fonte Python..."}
        </pre>
      </section>
    </div>
  );
};
