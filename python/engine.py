#!/usr/bin/env python3
"""
EcoFluxo — Motor de Banco de Dados (SQLite3) e Ciência de Dados (Python 3)
Responsável por:
  1. Persistência relacional (unidades, leituras, planos_acao)
  2. Operações CRUD completas (Cadastrar, Consultar, Atualizar, Excluir)
  3. Análises estatísticas: Z-Score (detecção de anomalias), Regressão Linear OLS (previsão),
     Correlação de Pearson, Média Móvel de 7 dias e Análise de Pareto de desperdício.
"""

import json
import math
import os
import random
import sqlite3
import statistics
import sys
import time
from datetime import date, datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "ecofluxo.db")


def get_connection():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(force_reseed=False):
    conn = get_connection()
    cur = conn.cursor()

    if force_reseed:
        cur.executescript(
            """
            DROP TABLE IF EXISTS planos_acao;
            DROP TABLE IF EXISTS leituras;
            DROP TABLE IF EXISTS unidades;
            """
        )

    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS unidades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            tipo TEXT NOT NULL,
            area_m2 REAL NOT NULL CHECK(area_m2 > 0),
            meta_kwh_dia REAL NOT NULL CHECK(meta_kwh_dia > 0),
            meta_m3_dia REAL NOT NULL CHECK(meta_m3_dia > 0),
            tarifa_kwh REAL NOT NULL DEFAULT 0.92 CHECK(tarifa_kwh > 0),
            tarifa_m3 REAL NOT NULL DEFAULT 8.40 CHECK(tarifa_m3 > 0),
            responsavel TEXT NOT NULL,
            criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS leituras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unidade_id INTEGER NOT NULL,
            data_leitura TEXT NOT NULL,
            consumo_kwh REAL NOT NULL CHECK(consumo_kwh >= 0),
            consumo_m3 REAL NOT NULL CHECK(consumo_m3 >= 0),
            temperatura_c REAL NOT NULL,
            ocupacao_pct REAL NOT NULL CHECK(ocupacao_pct >= 0 AND ocupacao_pct <= 100),
            observacoes TEXT DEFAULT '',
            criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS planos_acao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            unidade_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            categoria TEXT NOT NULL,
            impacto_estimado_brl REAL NOT NULL CHECK(impacto_estimado_brl >= 0),
            status TEXT NOT NULL DEFAULT 'Pendente',
            criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (unidade_id) REFERENCES unidades(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_leituras_data ON leituras(data_leitura);
        CREATE INDEX IF NOT EXISTS idx_leituras_unidade ON leituras(unidade_id);
        """
    )

    count = cur.execute("SELECT COUNT(*) FROM unidades").fetchone()[0]
    if count == 0:
        seed_initial_data(conn)

    conn.commit()
    conn.close()


def seed_initial_data(conn):
    cur = conn.cursor()
    rng = random.Random(42)

    unidades_seed = [
        ("Bloco Administrativo", "Administrativo", 680.0, 210.0, 14.0, 0.92, 8.40, "Mariana Costa"),
        ("Laboratório de TI & Servidores", "Tecnologia", 420.0, 340.0, 6.5, 0.92, 8.40, "Rafael Nogueira"),
        ("Refeitório Central", "Alimentação", 510.0, 245.0, 28.0, 0.92, 8.40, "Camila Ferreira"),
        ("Galpão de Logística", "Logística", 1150.0, 290.0, 11.0, 0.88, 8.10, "Lucas Almeida"),
        ("Auditório & Salas de Treinamento", "Acadêmico", 590.0, 175.0, 12.0, 0.92, 8.40, "Juliana Ribeiro"),
    ]

    cur.executemany(
        """
        INSERT INTO unidades (nome, tipo, area_m2, meta_kwh_dia, meta_m3_dia, tarifa_kwh, tarifa_m3, responsavel)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        unidades_seed,
    )

    unidade_rows = cur.execute("SELECT id, nome, meta_kwh_dia, meta_m3_dia FROM unidades").fetchall()
    end_date = date.today()
    days = 36

    leituras_batch = []
    for offset in range(days - 1, -1, -1):
        d = end_date - timedelta(days=offset)
        d_str = d.isoformat()
        is_weekend = d.weekday() >= 5
        # Temperatura sazonal realista com leve oscilação
        temp_base = 25.5 + 3.2 * math.sin(offset / 6.0) + rng.uniform(-1.4, 1.4)

        for u in unidade_rows:
            uid = u["id"]
            nome = u["nome"]
            meta_kwh = u["meta_kwh_dia"]
            meta_m3 = u["meta_m3_dia"]

            if "Laboratório" in nome:
                ocup = rng.uniform(55, 78) if is_weekend else rng.uniform(76, 96)
                kwh_factor = 0.88 if is_weekend else 0.97
            else:
                ocup = rng.uniform(12, 28) if is_weekend else rng.uniform(68, 95)
                kwh_factor = 0.42 if is_weekend else 0.95

            # Influência da temperatura e ocupação no consumo energético
            temp_effect = max(0.0, (temp_base - 22.0) * 0.018)
            ocup_effect = (ocup / 100.0) * 0.14
            kwh = meta_kwh * (kwh_factor * 0.85 + temp_effect + ocup_effect) * rng.uniform(0.94, 1.06)
            m3 = meta_m3 * (0.45 if is_weekend else 0.93) * rng.uniform(0.91, 1.07)
            obs = ""

            # Injetar anomalias reais identificáveis por Ciência de Dados
            if "Refeitório" in nome and offset in (3, 4, 5):
                # Vazamento oculto em tubulação aumentando consumo hídrico gradualmente
                m3 = meta_m3 * rng.uniform(1.62, 1.88)
                obs = "Pico hídrico atípico identificado fora da curva normal"
            elif "Laboratório" in nome and offset in (2, 8):
                # Chiller / climatização ligada fora do expediente
                kwh = meta_kwh * rng.uniform(1.44, 1.56)
                obs = "Consumo elevado em horário de baixa ocupação (climatização)"
            elif "Bloco Administrativo" in nome and offset == 1:
                kwh = meta_kwh * 1.42
                obs = "Sobrecarga no circuito de iluminação e ar-condicionado"
            elif "Galpão" in nome and offset == 6:
                m3 = meta_m3 * 1.78
                obs = "Suspeita de válvula de descarga travada no setor B"

            leituras_batch.append(
                (
                    uid,
                    d_str,
                    round(kwh, 2),
                    round(m3, 2),
                    round(temp_base, 1),
                    round(ocup, 1),
                    obs,
                )
            )

    cur.executemany(
        """
        INSERT INTO leituras (unidade_id, data_leitura, consumo_kwh, consumo_m3, temperatura_c, ocupacao_pct, observacoes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        leituras_batch,
    )

    # Buscar IDs das unidades para planos de ação
    uid_map = {r["nome"]: r["id"] for r in unidade_rows}
    planos_seed = [
        (
            uid_map["Refeitório Central"],
            "Inspeção e reparo de vazamento na linha de lavagem industrial",
            "Vazamento Hídrico",
            1420.00,
            "Em Execução",
        ),
        (
            uid_map["Laboratório de TI & Servidores"],
            "Automação de set-point do chiller nos finais de semana",
            "Climatização",
            1890.00,
            "Pendente",
        ),
        (
            uid_map["Bloco Administrativo"],
            "Instalação de sensores de presença e desligamento automático às 19h",
            "Automação",
            960.00,
            "Pendente",
        ),
        (
            uid_map["Galpão de Logística"],
            "Substituição de válvulas hidromecânicas nos vestiários do Setor B",
            "Vazamento Hídrico",
            540.00,
            "Concluído",
        ),
    ]

    cur.executemany(
        """
        INSERT INTO planos_acao (unidade_id, titulo, categoria, impacto_estimado_brl, status)
        VALUES (?, ?, ?, ?, ?)
        """,
        planos_seed,
    )


def enrich_leituras_with_zscore(rows):
    """Calcula Z-score por unidade para energia (kWh) e água (m³) usando statistics."""
    by_unit = {}
    for r in rows:
        uid = r["unidade_id"]
        by_unit.setdefault(uid, {"kwh": [], "m3": []})
        by_unit[uid]["kwh"].append(r["consumo_kwh"])
        by_unit[uid]["m3"].append(r["consumo_m3"])

    stats_by_unit = {}
    for uid, vals in by_unit.items():
        kwh_list = vals["kwh"]
        m3_list = vals["m3"]
        mean_kwh = statistics.mean(kwh_list) if kwh_list else 0.0
        std_kwh = statistics.pstdev(kwh_list) if len(kwh_list) > 1 else 0.0
        mean_m3 = statistics.mean(m3_list) if m3_list else 0.0
        std_m3 = statistics.pstdev(m3_list) if len(m3_list) > 1 else 0.0
        stats_by_unit[uid] = {
            "mean_kwh": mean_kwh,
            "std_kwh": std_kwh,
            "mean_m3": mean_m3,
            "std_m3": std_m3,
        }

    enriched = []
    for r in rows:
        item = dict(r)
        st = stats_by_unit[item["unidade_id"]]
        z_kwh = (item["consumo_kwh"] - st["mean_kwh"]) / st["std_kwh"] if st["std_kwh"] > 0.0001 else 0.0
        z_m3 = (item["consumo_m3"] - st["mean_m3"]) / st["std_m3"] if st["std_m3"] > 0.0001 else 0.0
        max_z = max(z_kwh, z_m3)

        custo_kwh = item["consumo_kwh"] * item["tarifa_kwh"]
        custo_m3 = item["consumo_m3"] * item["tarifa_m3"]
        custo_total = custo_kwh + custo_m3

        excesso_meta_kwh = item["consumo_kwh"] > (item["meta_kwh_dia"] * 1.2)
        excesso_meta_m3 = item["consumo_m3"] > (item["meta_m3_dia"] * 1.2)

        if max_z >= 2.2 or (excesso_meta_kwh and z_kwh >= 1.7) or (excesso_meta_m3 and z_m3 >= 1.7):
            status_anomalia = "Crítico"
        elif max_z >= 1.5 or excesso_meta_kwh or excesso_meta_m3:
            status_anomalia = "Atenção"
        else:
            status_anomalia = "Normal"

        tipo_anomalia = "Dentro do padrão"
        if status_anomalia != "Normal":
            if z_m3 >= z_kwh and (z_m3 >= 1.5 or excesso_meta_m3):
                tipo_anomalia = "Anomalia Hídrica"
            else:
                tipo_anomalia = "Pico Energético"

        item["z_kwh"] = round(z_kwh, 2)
        item["z_m3"] = round(z_m3, 2)
        item["z_max"] = round(max_z, 2)
        item["custo_total"] = round(custo_total, 2)
        item["status_anomalia"] = status_anomalia
        item["tipo_anomalia"] = tipo_anomalia
        enriched.append(item)

    return enriched


def ols_regression(values):
    """Regressão Linear Simples (Mínimos Quadrados) e R²."""
    n = len(values)
    if n < 2:
        val = values[0] if n == 1 else 0.0
        return {"slope": 0.0, "intercept": val, "r2": 0.0}

    xs = list(range(n))
    mean_x = statistics.mean(xs)
    mean_y = statistics.mean(values)

    ss_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values))
    ss_xx = sum((x - mean_x) ** 2 for x in xs)
    ss_tot = sum((y - mean_y) ** 2 for y in values)

    slope = ss_xy / ss_xx if ss_xx > 0 else 0.0
    intercept = mean_y - slope * mean_x

    ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(xs, values))
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

    return {
        "slope": round(slope, 4),
        "intercept": round(intercept, 2),
        "r2": round(max(0.0, min(1.0, r2)), 4),
    }


def pearson_correlation(xs, ys):
    """Correlação linear de Pearson r."""
    n = len(xs)
    if n < 3:
        return 0.0
    mx = statistics.mean(xs)
    my = statistics.mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den_x = math.sqrt(sum((x - mx) ** 2 for x in xs))
    den_y = math.sqrt(sum((y - my) ** 2 for y in ys))
    if den_x == 0 or den_y == 0:
        return 0.0
    return round(num / (den_x * den_y), 4)


def fetch_all_enriched_leituras(conn, filters=None):
    filters = filters or {}
    query = """
        SELECT
            l.id,
            l.unidade_id,
            u.nome AS unidade_nome,
            u.tipo AS unidade_tipo,
            u.area_m2,
            u.meta_kwh_dia,
            u.meta_m3_dia,
            u.tarifa_kwh,
            u.tarifa_m3,
            l.data_leitura,
            l.consumo_kwh,
            l.consumo_m3,
            l.temperatura_c,
            l.ocupacao_pct,
            l.observacoes,
            l.criado_em
        FROM leituras l
        INNER JOIN unidades u ON u.id = l.unidade_id
        ORDER BY l.data_leitura ASC, l.id ASC
    """
    rows = conn.execute(query).fetchall()
    enriched = enrich_leituras_with_zscore(rows)

    unidade_id = filters.get("unidade_id")
    if unidade_id and str(unidade_id) != "all":
        enriched = [r for r in enriched if str(r["unidade_id"]) == str(unidade_id)]

    start_date = filters.get("start_date")
    if start_date:
        enriched = [r for r in enriched if r["data_leitura"] >= start_date]

    end_date = filters.get("end_date")
    if end_date:
        enriched = [r for r in enriched if r["data_leitura"] <= end_date]

    status_filter = filters.get("status")
    if status_filter and status_filter != "all":
        if status_filter == "anomalies":
            enriched = [r for r in enriched if r["status_anomalia"] in ("Crítico", "Atenção")]
        else:
            enriched = [r for r in enriched if r["status_anomalia"] == status_filter]

    search = (filters.get("search") or "").strip().lower()
    if search:
        enriched = [
            r
            for r in enriched
            if search in r["unidade_nome"].lower()
            or search in (r["observacoes"] or "").lower()
            or search in r["data_leitura"].lower()
            or search in r["tipo_anomalia"].lower()
        ]

    return enriched


def get_dashboard_payload(unidade_id="all"):
    conn = get_connection()
    filters = {"unidade_id": unidade_id} if unidade_id and unidade_id != "all" else {}
    leituras = fetch_all_enriched_leituras(conn, filters)
    unidades = [dict(r) for r in conn.execute("SELECT * FROM unidades ORDER BY id ASC").fetchall()]
    planos = [
        dict(r)
        for r in conn.execute(
            """
            SELECT p.*, u.nome AS unidade_nome
            FROM planos_acao p
            INNER JOIN unidades u ON u.id = p.unidade_id
            ORDER BY p.id DESC
            """
        ).fetchall()
    ]
    conn.close()

    total_kwh = sum(r["consumo_kwh"] for r in leituras)
    total_m3 = sum(r["consumo_m3"] for r in leituras)
    custo_total = sum(r["custo_total"] for r in leituras)
    anomalias = [r for r in leituras if r["status_anomalia"] in ("Crítico", "Atenção")]
    criticas = [r for r in leituras if r["status_anomalia"] == "Crítico"]

    # Desperdício calculado: soma do consumo excedente acima da meta nos dias com anomalia/excesso
    desperdicio_brl = 0.0
    for r in leituras:
        ex_kwh = max(0.0, r["consumo_kwh"] - r["meta_kwh_dia"])
        ex_m3 = max(0.0, r["consumo_m3"] - r["meta_m3_dia"])
        desperdicio_brl += ex_kwh * r["tarifa_kwh"] + ex_m3 * r["tarifa_m3"]

    # Série temporal diária agregada
    by_day = {}
    for r in leituras:
        d = r["data_leitura"]
        if d not in by_day:
            by_day[d] = {
                "data": d,
                "kwh": 0.0,
                "m3": 0.0,
                "custo": 0.0,
                "meta_kwh": 0.0,
                "meta_m3": 0.0,
                "anomalias": 0,
            }
        by_day[d]["kwh"] += r["consumo_kwh"]
        by_day[d]["m3"] += r["consumo_m3"]
        by_day[d]["custo"] += r["custo_total"]
        by_day[d]["meta_kwh"] += r["meta_kwh_dia"]
        by_day[d]["meta_m3"] += r["meta_m3_dia"]
        if r["status_anomalia"] in ("Crítico", "Atenção"):
            by_day[d]["anomalias"] += 1

    sorted_days = sorted(by_day.values(), key=lambda x: x["data"])
    kwh_series = [d["kwh"] for d in sorted_days]
    m3_series = [d["m3"] for d in sorted_days]
    custo_series = [d["custo"] for d in sorted_days]

    reg_kwh = ols_regression(kwh_series)
    reg_m3 = ols_regression(m3_series)
    reg_custo = ols_regression(custo_series)

    for idx, d in enumerate(sorted_days):
        win_start = max(0, idx - 6)
        d["kwh"] = round(d["kwh"], 2)
        d["m3"] = round(d["m3"], 2)
        d["custo"] = round(d["custo"], 2)
        d["meta_kwh"] = round(d["meta_kwh"], 2)
        d["meta_m3"] = round(d["meta_m3"], 2)
        d["ma7_kwh"] = round(statistics.mean(kwh_series[win_start : idx + 1]), 2)
        d["ma7_m3"] = round(statistics.mean(m3_series[win_start : idx + 1]), 2)
        d["ma7_custo"] = round(statistics.mean(custo_series[win_start : idx + 1]), 2)
        d["trend_kwh"] = round(max(0.0, reg_kwh["slope"] * idx + reg_kwh["intercept"]), 2)
        d["trend_m3"] = round(max(0.0, reg_m3["slope"] * idx + reg_m3["intercept"]), 2)
        d["trend_custo"] = round(max(0.0, reg_custo["slope"] * idx + reg_custo["intercept"]), 2)

    # Previsão para próximos 14 dias usando Regressão Linear OLS
    forecast_14d = []
    if sorted_days:
        last_date = date.fromisoformat(sorted_days[-1]["data"])
        n_hist = len(sorted_days)
        for step in range(1, 15):
            f_date = (last_date + timedelta(days=step)).isoformat()
            x_idx = n_hist - 1 + step
            f_kwh = max(0.0, reg_kwh["slope"] * x_idx + reg_kwh["intercept"])
            f_m3 = max(0.0, reg_m3["slope"] * x_idx + reg_m3["intercept"])
            f_custo = max(0.0, reg_custo["slope"] * x_idx + reg_custo["intercept"])
            forecast_14d.append(
                {
                    "data": f_date,
                    "kwh_previsto": round(f_kwh, 2),
                    "m3_previsto": round(f_m3, 2),
                    "custo_previsto": round(f_custo, 2),
                }
            )

    # Projeção de 30 dias baseada na regressão
    projecao_30d_brl = 0.0
    if sorted_days:
        n_hist = len(sorted_days)
        projecao_30d_brl = sum(
            max(0.0, reg_custo["slope"] * (n_hist + i) + reg_custo["intercept"]) for i in range(30)
        )

    # Análise por unidade (Pareto & Eficiência)
    unit_stats_map = {}
    for r in leituras:
        uid = r["unidade_id"]
        if uid not in unit_stats_map:
            unit_stats_map[uid] = {
                "unidade_id": uid,
                "nome": r["unidade_nome"],
                "tipo": r["unidade_tipo"],
                "area_m2": r["area_m2"],
                "dias": 0,
                "total_kwh": 0.0,
                "total_m3": 0.0,
                "meta_total_kwh": 0.0,
                "meta_total_m3": 0.0,
                "custo_total": 0.0,
                "desperdicio_brl": 0.0,
                "anomalias": 0,
            }
        u = unit_stats_map[uid]
        u["dias"] += 1
        u["total_kwh"] += r["consumo_kwh"]
        u["total_m3"] += r["consumo_m3"]
        u["meta_total_kwh"] += r["meta_kwh_dia"]
        u["meta_total_m3"] += r["meta_m3_dia"]
        u["custo_total"] += r["custo_total"]
        u["desperdicio_brl"] += max(0.0, r["consumo_kwh"] - r["meta_kwh_dia"]) * r["tarifa_kwh"] + max(
            0.0, r["consumo_m3"] - r["meta_m3_dia"]
        ) * r["tarifa_m3"]
        if r["status_anomalia"] in ("Crítico", "Atenção"):
            u["anomalias"] += 1

    unit_pareto = []
    for u in unit_stats_map.values():
        desvio_kwh_pct = (
            ((u["total_kwh"] - u["meta_total_kwh"]) / u["meta_total_kwh"]) * 100.0
            if u["meta_total_kwh"] > 0
            else 0.0
        )
        desvio_m3_pct = (
            ((u["total_m3"] - u["meta_total_m3"]) / u["meta_total_m3"]) * 100.0
            if u["meta_total_m3"] > 0
            else 0.0
        )
        intensidade_kwh_m2 = (u["total_kwh"] / u["dias"]) / u["area_m2"] if u["dias"] > 0 and u["area_m2"] > 0 else 0.0
        unit_pareto.append(
            {
                "unidade_id": u["unidade_id"],
                "nome": u["nome"],
                "tipo": u["tipo"],
                "dias": u["dias"],
                "total_kwh": round(u["total_kwh"], 1),
                "total_m3": round(u["total_m3"], 1),
                "meta_total_kwh": round(u["meta_total_kwh"], 1),
                "meta_total_m3": round(u["meta_total_m3"], 1),
                "custo_total": round(u["custo_total"], 2),
                "desperdicio_brl": round(u["desperdicio_brl"], 2),
                "desvio_kwh_pct": round(desvio_kwh_pct, 1),
                "desvio_m3_pct": round(desvio_m3_pct, 1),
                "intensidade_kwh_m2": round(intensidade_kwh_m2, 3),
                "anomalias": u["anomalias"],
            }
        )
    unit_pareto.sort(key=lambda x: x["custo_total"], reverse=True)

    # Correlações de Pearson e pontos de dispersão
    temps = [r["temperatura_c"] for r in leituras]
    ocups = [r["ocupacao_pct"] for r in leituras]
    kwhs = [r["consumo_kwh"] for r in leituras]
    r_temp_kwh = pearson_correlation(temps, kwhs)
    r_ocup_kwh = pearson_correlation(ocups, kwhs)

    scatter_points = [
        {
            "id": r["id"],
            "unidade_nome": r["unidade_nome"],
            "data_leitura": r["data_leitura"],
            "temperatura_c": r["temperatura_c"],
            "ocupacao_pct": r["ocupacao_pct"],
            "consumo_kwh": r["consumo_kwh"],
            "consumo_m3": r["consumo_m3"],
            "status_anomalia": r["status_anomalia"],
        }
        for r in leituras[-120:]
    ]

    # Top anomalias recentes ordenadas por gravidade (z_max) e data
    top_anomalias = sorted(
        anomalias,
        key=lambda x: (x["data_leitura"], x["z_max"]),
        reverse=True,
    )[:12]

    economia_planos_brl = sum(p["impacto_estimado_brl"] for p in planos if p["status"] != "Concluído")

    return {
        "kpis": {
            "total_registros": len(leituras),
            "total_unidades": len(unidades),
            "total_kwh": round(total_kwh, 1),
            "total_m3": round(total_m3, 1),
            "custo_total_brl": round(custo_total, 2),
            "desperdicio_brl": round(desperdicio_brl, 2),
            "economia_potencial_brl": round(max(desperdicio_brl, economia_planos_brl), 2),
            "anomalias_total": len(anomalias),
            "anomalias_criticas": len(criticas),
            "projecao_30d_brl": round(projecao_30d_brl, 2),
            "co2_evitavel_kg": round((desperdicio_brl / 0.92) * 0.084, 1),
        },
        "data_science": {
            "regressao_kwh": reg_kwh,
            "regressao_m3": reg_m3,
            "regressao_custo": reg_custo,
            "correlacao_temp_kwh": r_temp_kwh,
            "correlacao_ocup_kwh": r_ocup_kwh,
            "forecast_14d": forecast_14d,
            "scatter_points": scatter_points,
        },
        "time_series": sorted_days,
        "unit_pareto": unit_pareto,
        "top_anomalias": top_anomalias,
        "unidades": unidades,
        "planos_acao": planos,
    }


def handle_command(payload):
    init_db()
    action = payload.get("action")
    data = payload.get("data") or {}

    if action == "dashboard":
        return get_dashboard_payload(data.get("unidade_id", "all"))

    if action == "list_unidades":
        conn = get_connection()
        rows = conn.execute(
            """
            SELECT u.*,
                   COUNT(l.id) AS total_leituras,
                   COALESCE(ROUND(AVG(l.consumo_kwh), 1), 0) AS media_kwh,
                   COALESCE(ROUND(AVG(l.consumo_m3), 1), 0) AS media_m3
            FROM unidades u
            LEFT JOIN leituras l ON l.unidade_id = u.id
            GROUP BY u.id
            ORDER BY u.id ASC
            """
        ).fetchall()
        conn.close()
        return {"unidades": [dict(r) for r in rows]}

    if action == "create_unidade":
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO unidades (nome, tipo, area_m2, meta_kwh_dia, meta_m3_dia, tarifa_kwh, tarifa_m3, responsavel)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data["nome"].strip(),
                data["tipo"].strip(),
                float(data["area_m2"]),
                float(data["meta_kwh_dia"]),
                float(data["meta_m3_dia"]),
                float(data.get("tarifa_kwh", 0.92)),
                float(data.get("tarifa_m3", 8.40)),
                data["responsavel"].strip(),
            ),
        )
        new_id = cur.lastrowid
        conn.commit()
        row = dict(conn.execute("SELECT * FROM unidades WHERE id = ?", (new_id,)).fetchone())
        conn.close()
        return {"unidade": row}

    if action == "update_unidade":
        conn = get_connection()
        conn.execute(
            """
            UPDATE unidades
            SET nome = ?, tipo = ?, area_m2 = ?, meta_kwh_dia = ?, meta_m3_dia = ?,
                tarifa_kwh = ?, tarifa_m3 = ?, responsavel = ?
            WHERE id = ?
            """,
            (
                data["nome"].strip(),
                data["tipo"].strip(),
                float(data["area_m2"]),
                float(data["meta_kwh_dia"]),
                float(data["meta_m3_dia"]),
                float(data["tarifa_kwh"]),
                float(data["tarifa_m3"]),
                data["responsavel"].strip(),
                int(data["id"]),
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM unidades WHERE id = ?", (int(data["id"]),)).fetchone()
        conn.close()
        if not row:
            raise ValueError("Unidade não encontrada")
        return {"unidade": dict(row)}

    if action == "delete_unidade":
        conn = get_connection()
        cur = conn.execute("DELETE FROM unidades WHERE id = ?", (int(data["id"]),))
        conn.commit()
        conn.close()
        if cur.rowcount == 0:
            raise ValueError("Unidade não encontrada")
        return {"deleted": True, "id": int(data["id"])}

    if action == "list_leituras":
        conn = get_connection()
        enriched = fetch_all_enriched_leituras(conn, data)
        conn.close()
        enriched.sort(key=lambda x: (x["data_leitura"], x["id"]), reverse=True)
        return {"leituras": enriched}

    if action == "create_leitura":
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO leituras (unidade_id, data_leitura, consumo_kwh, consumo_m3, temperatura_c, ocupacao_pct, observacoes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                int(data["unidade_id"]),
                data["data_leitura"],
                float(data["consumo_kwh"]),
                float(data["consumo_m3"]),
                float(data["temperatura_c"]),
                float(data["ocupacao_pct"]),
                (data.get("observacoes") or "").strip(),
            ),
        )
        new_id = cur.lastrowid
        conn.commit()
        enriched = fetch_all_enriched_leituras(conn)
        conn.close()
        created = next((r for r in enriched if r["id"] == new_id), None)
        return {"leitura": created}

    if action == "update_leitura":
        conn = get_connection()
        cur = conn.execute(
            """
            UPDATE leituras
            SET unidade_id = ?, data_leitura = ?, consumo_kwh = ?, consumo_m3 = ?,
                temperatura_c = ?, ocupacao_pct = ?, observacoes = ?
            WHERE id = ?
            """,
            (
                int(data["unidade_id"]),
                data["data_leitura"],
                float(data["consumo_kwh"]),
                float(data["consumo_m3"]),
                float(data["temperatura_c"]),
                float(data["ocupacao_pct"]),
                (data.get("observacoes") or "").strip(),
                int(data["id"]),
            ),
        )
        conn.commit()
        if cur.rowcount == 0:
            conn.close()
            raise ValueError("Registro de leitura não encontrado")
        enriched = fetch_all_enriched_leituras(conn)
        conn.close()
        updated = next((r for r in enriched if r["id"] == int(data["id"])), None)
        return {"leitura": updated}

    if action == "delete_leitura":
        conn = get_connection()
        cur = conn.execute("DELETE FROM leituras WHERE id = ?", (int(data["id"]),))
        conn.commit()
        conn.close()
        if cur.rowcount == 0:
            raise ValueError("Registro de leitura não encontrado")
        return {"deleted": True, "id": int(data["id"])}

    if action == "create_plano":
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO planos_acao (unidade_id, titulo, categoria, impacto_estimado_brl, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                int(data["unidade_id"]),
                data["titulo"].strip(),
                data["categoria"].strip(),
                float(data["impacto_estimado_brl"]),
                data.get("status", "Pendente"),
            ),
        )
        new_id = cur.lastrowid
        conn.commit()
        row = dict(
            conn.execute(
                """
                SELECT p.*, u.nome AS unidade_nome
                FROM planos_acao p
                INNER JOIN unidades u ON u.id = p.unidade_id
                WHERE p.id = ?
                """,
                (new_id,),
            ).fetchone()
        )
        conn.close()
        return {"plano": row}

    if action == "update_plano":
        conn = get_connection()
        conn.execute(
            """
            UPDATE planos_acao
            SET status = COALESCE(?, status),
                titulo = COALESCE(?, titulo),
                impacto_estimado_brl = COALESCE(?, impacto_estimado_brl)
            WHERE id = ?
            """,
            (
                data.get("status"),
                data.get("titulo"),
                float(data["impacto_estimado_brl"]) if "impacto_estimado_brl" in data and data["impacto_estimado_brl"] is not None else None,
                int(data["id"]),
            ),
        )
        conn.commit()
        row = dict(
            conn.execute(
                """
                SELECT p.*, u.nome AS unidade_nome
                FROM planos_acao p
                INNER JOIN unidades u ON u.id = p.unidade_id
                WHERE p.id = ?
                """,
                (int(data["id"]),),
            ).fetchone()
        )
        conn.close()
        return {"plano": row}

    if action == "delete_plano":
        conn = get_connection()
        conn.execute("DELETE FROM planos_acao WHERE id = ?", (int(data["id"]),))
        conn.commit()
        conn.close()
        return {"deleted": True, "id": int(data["id"])}

    if action == "run_sql":
        sql = (data.get("query") or "").strip()
        if not sql:
            raise ValueError("Informe uma consulta SQL.")
        normalized = sql.lstrip().upper()
        if not (normalized.startswith("SELECT") or normalized.startswith("PRAGMA") or normalized.startswith("WITH")):
            raise ValueError("O console SQL interativo aceita apenas consultas de leitura (SELECT, WITH, PRAGMA).")
        forbidden = ("DROP ", "DELETE ", "UPDATE ", "INSERT ", "ALTER ", "ATTACH ", "DETACH ")
        for kw in forbidden:
            if kw in normalized:
                raise ValueError(f"Comando não permitido no console de leitura: {kw.strip()}")

        t0 = time.perf_counter()
        conn = get_connection()
        cur = conn.execute(sql)
        cols = [desc[0] for desc in cur.description] if cur.description else []
        rows = [list(r) for r in cur.fetchall()[:200]]
        conn.close()
        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        return {"columns": cols, "rows": rows, "elapsed_ms": elapsed_ms, "row_count": len(rows)}

    if action == "reset_demo":
        init_db(force_reseed=True)
        return {"reset": True}

    raise ValueError(f"Ação desconhecida: {action}")


if __name__ == "__main__":
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {"action": "dashboard"}
        result = handle_command(payload)
        sys.stdout.write(json.dumps({"ok": True, "data": result}, ensure_ascii=False))
    except Exception as exc:
        sys.stdout.write(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False))
        sys.exit(1)
