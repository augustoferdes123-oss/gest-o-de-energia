import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = process.cwd();
const PYTHON_ENGINE = path.join(ROOT_DIR, "python", "engine.py");
const PYTHON_DESKTOP = path.join(ROOT_DIR, "python", "ecofluxo_desktop.py");

interface PythonResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

function runPythonEngine<T = unknown>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [PYTHON_ENGINE], {
      cwd: ROOT_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      reject(new Error(`Falha ao iniciar Python 3: ${err.message}`));
    });

    child.on("close", (code) => {
      if (!stdout.trim()) {
        reject(new Error(stderr.trim() || `Processo Python encerrou com código ${code}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as PythonResponse<T>;
        if (!parsed.ok) {
          reject(new Error(parsed.error || "Erro no motor Python"));
          return;
        }
        resolve(parsed.data as T);
      } catch (err) {
        reject(new Error(`Resposta inválida do motor Python: ${(err as Error).message}`));
      }
    });

    child.stdin.write(JSON.stringify({ action, data }));
    child.stdin.end();
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Dashboard & Ciência de Dados
  app.get("/api/dashboard", async (req, res) => {
    try {
      const unidadeId = typeof req.query.unidade_id === "string" ? req.query.unidade_id : "all";
      const payload = await runPythonEngine("dashboard", { unidade_id: unidadeId });
      res.json(payload);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // CRUD Unidades
  app.get("/api/unidades", async (_req, res) => {
    try {
      const payload = await runPythonEngine("list_unidades");
      res.json(payload);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/unidades", async (req, res) => {
    try {
      const payload = await runPythonEngine("create_unidade", req.body);
      res.status(201).json(payload);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.put("/api/unidades/:id", async (req, res) => {
    try {
      const payload = await runPythonEngine("update_unidade", { ...req.body, id: Number(req.params.id) });
      res.json(payload);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/unidades/:id", async (req, res) => {
    try {
      const payload = await runPythonEngine("delete_unidade", { id: Number(req.params.id) });
      res.json(payload);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // CRUD Leituras (Registros)
  app.get("/api/leituras", async (req, res) => {
    try {
      const payload = await runPythonEngine("list_leituras", {
        unidade_id: req.query.unidade_id || "all",
        status: req.query.status || "all",
        search: req.query.search || "",
        start_date: req.query.start_date || "",
        end_date: req.query.end_date || "",
      });
      res.json(payload);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/leituras", async (req, res) => {
    try {
      const payload = await runPythonEngine("create_leitura", req.body);
      res.status(201).json(payload);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.put("/api/leituras/:id", async (req, res) => {
    try {
      const payload = await runPythonEngine("update_leitura", { ...req.body, id: Number(req.params.id) });
      res.json(payload);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/leituras/:id", async (req, res) => {
    try {
      const payload = await runPythonEngine("delete_leitura", { id: Number(req.params.id) });
      res.json(payload);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Planos de Ação (Solução de Engenharia)
  app.post("/api/planos", async (req, res) => {
    try {
      const payload = await runPythonEngine("create_plano", req.body);
      res.status(201).json(payload);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.patch("/api/planos/:id", async (req, res) => {
    try {
      const payload = await runPythonEngine("update_plano", { ...req.body, id: Number(req.params.id) });
      res.json(payload);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete("/api/planos/:id", async (req, res) => {
    try {
      const payload = await runPythonEngine("delete_plano", { id: Number(req.params.id) });
      res.json(payload);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Console SQL ao vivo via Python SQLite3
  app.post("/api/sql", async (req, res) => {
    try {
      const payload = await runPythonEngine("run_sql", { query: req.body?.query || "" });
      res.json(payload);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Código-fonte Python real para visualização/download
  app.get("/api/python-source", (_req, res) => {
    try {
      const engineCode = fs.readFileSync(PYTHON_ENGINE, "utf-8");
      const desktopCode = fs.readFileSync(PYTHON_DESKTOP, "utf-8");
      res.json({ engineCode, desktopCode });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Resetar base de demonstração
  app.post("/api/reset-demo", async (_req, res) => {
    try {
      const payload = await runPythonEngine("reset_demo");
      res.json(payload);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite middleware em desenvolvimento ou arquivos estáticos em produção
  const distDir = path.join(ROOT_DIR, "dist");
  const isProd = process.env.NODE_ENV === "production" && fs.existsSync(distDir);

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EcoFluxo server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
