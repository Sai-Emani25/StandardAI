import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add middleware
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ 
        status: "ok", 
        system: "BIS_STANDARDS_ENGINE", 
        version: "1.0.4",
        region: "asia-southeast1" 
    });
  });

  // Mock Ingestion Endpoint
  app.post("/api/ingest", (req, res) => {
    // In a real app, this would process PDFs and update a vector store
    res.json({ message: "Ingestion pipeline triggered. Parsing BIS SP 21 content..." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BIS_ENGINE] Operational on http://localhost:${PORT}`);
  });
}

startServer();
