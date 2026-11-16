#!/usr/bin/env python3
"""
EcoFluxo Desktop — Versão Standalone em Python (Tkinter + SQLite3 + Ciência de Dados)
Sistema completo para execução local em ambiente desktop Python.
"""

import sqlite3
import statistics
import tkinter as tk
from datetime import date
from tkinter import messagebox, ttk

DB_FILE = "ecofluxo.db"


class EcoFluxoApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("EcoFluxo — Gestão Hídrica, Energética e Ciência de Dados")
        self.geometry("1120x680")
        self.configure(bg="#F8FAFC")

        self.conn = sqlite3.connect(DB_FILE)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON;")
        self._criar_tabelas()
        self._construir_interface()
        self.atualizar_dados()

    def _criar_tabelas(self):
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS unidades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE,
                tipo TEXT NOT NULL,
                area_m2 REAL NOT NULL,
                meta_kwh_dia REAL NOT NULL,
                meta_m3_dia REAL NOT NULL,
                tarifa_kwh REAL NOT NULL DEFAULT 0.92,
                tarifa_m3 REAL NOT NULL DEFAULT 8.40,
                responsavel TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS leituras (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                unidade_id INTEGER NOT NULL,
                data_leitura TEXT NOT NULL,
                consumo_kwh REAL NOT NULL,
                consumo_m3 REAL NOT NULL,
                temperatura_c REAL NOT NULL,
                ocupacao_pct REAL NOT NULL,
                observacoes TEXT DEFAULT '',
                FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE
            );
            """
        )
        if self.conn.execute("SELECT COUNT(*) FROM unidades").fetchone()[0] == 0:
            self.conn.execute(
                "INSERT INTO unidades (nome, tipo, area_m2, meta_kwh_dia, meta_m3_dia, responsavel) VALUES (?, ?, ?, ?, ?, ?)",
                ("Bloco Administrativo", "Administrativo", 680, 210, 14, "Mariana Costa"),
            )
            self.conn.commit()

    def _construir_interface(self):
        topo = tk.Frame(self, bg="#0F172A", height=56)
        topo.pack(fill="x")
        tk.Label(
            topo,
            text="EcoFluxo — Monitoramento Hídrico, Energético & Ciência de Dados",
            fg="#FFFFFF",
            bg="#0F172A",
            font=("Segoe UI", 13, "bold"),
        ).pack(side="left", padx=18, pady=14)

        self.lbl_kpis = tk.Label(
            self,
            text="Carregando indicadores...",
            bg="#FFFFFF",
            fg="#0F172A",
            font=("Consolas", 10),
            anchor="w",
            padx=16,
            pady=10,
            relief="solid",
            bd=1,
        )
        self.lbl_kpis.pack(fill="x", padx=16, pady=(12, 8))

        form = tk.LabelFrame(self, text="Cadastro / Edição de Leitura", bg="#F8FAFC", padx=12, pady=10)
        form.pack(fill="x", padx=16, pady=6)

        self.var_data = tk.StringVar(value=date.today().isoformat())
        self.var_kwh = tk.StringVar(value="215.0")
        self.var_m3 = tk.StringVar(value="14.5")
        self.var_temp = tk.StringVar(value="26.0")
        self.var_ocup = tk.StringVar(value="82.0")

        campos = [
            ("Data (AAAA-MM-DD):", self.var_data),
            ("Consumo (kWh):", self.var_kwh),
            ("Consumo (m³):", self.var_m3),
            ("Temp (°C):", self.var_temp),
            ("Ocupação (%):", self.var_ocup),
        ]
        for col, (label, var) in enumerate(campos):
            tk.Label(form, text=label, bg="#F8FAFC").grid(row=0, column=col * 2, sticky="w", padx=4)
            tk.Entry(form, textvariable=var, width=13).grid(row=0, column=col * 2 + 1, padx=(0, 10))

        tk.Button(form, text="Cadastrar Leitura", command=self.cadastrar, bg="#0F766E", fg="white", padx=12).grid(
            row=0, column=10, padx=4
        )
        tk.Button(form, text="Excluir Selecionado", command=self.excluir, bg="#B91C1C", fg="white", padx=12).grid(
            row=0, column=11, padx=4
        )

        colunas = ("id", "unidade", "data", "kwh", "m3", "z_kwh", "status")
        self.tree = ttk.Treeview(self, columns=colunas, show="headings", height=16)
        for col, title in zip(colunas, ["ID", "Unidade", "Data", "Energia (kWh)", "Água (m³)", "Z-Score", "Status"]):
            self.tree.heading(col, text=title)
            self.tree.column(col, width=140, anchor="center")
        self.tree.pack(fill="both", expand=True, padx=16, pady=10)

    def cadastrar(self):
        try:
            uid = self.conn.execute("SELECT id FROM unidades LIMIT 1").fetchone()["id"]
            self.conn.execute(
                """
                INSERT INTO leituras (unidade_id, data_leitura, consumo_kwh, consumo_m3, temperatura_c, ocupacao_pct)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    uid,
                    self.var_data.get(),
                    float(self.var_kwh.get()),
                    float(self.var_m3.get()),
                    float(self.var_temp.get()),
                    float(self.var_ocup.get()),
                ),
            )
            self.conn.commit()
            self.atualizar_dados()
        except Exception as e:
            messagebox.showerror("Erro ao cadastrar", str(e))

    def excluir(self):
        sel = self.tree.selection()
        if not sel:
            return
        item_id = self.tree.item(sel[0])["values"][0]
        self.conn.execute("DELETE FROM leituras WHERE id = ?", (item_id,))
        self.conn.commit()
        self.atualizar_dados()

    def atualizar_dados(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        rows = self.conn.execute(
            """
            SELECT l.*, u.nome AS unidade_nome
            FROM leituras l JOIN unidades u ON u.id = l.unidade_id
            ORDER BY l.data_leitura DESC, l.id DESC
            """
        ).fetchall()

        kwhs = [r["consumo_kwh"] for r in rows]
        media = statistics.mean(kwhs) if kwhs else 0.0
        desvio = statistics.pstdev(kwhs) if len(kwhs) > 1 else 0.0
        anomalias = 0

        for r in rows:
            z = (r["consumo_kwh"] - media) / desvio if desvio > 0 else 0.0
            status = "Crítico" if z >= 2.0 else "Normal"
            if status == "Crítico":
                anomalias += 1
            self.tree.insert(
                "",
                "end",
                values=(r["id"], r["unidade_nome"], r["data_leitura"], r["consumo_kwh"], r["consumo_m3"], f"{z:+.2f}σ", status),
            )

        self.lbl_kpis.config(
            text=f"Registros: {len(rows)}  |  Média Energia: {media:.1f} kWh/dia  |  Desvio Padrão: {desvio:.2f}  |  Anomalias (Z>=2.0): {anomalias}"
        )


if __name__ == "__main__":
    app = EcoFluxoApp()
    app.mainloop()
