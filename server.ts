import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing and URL encoded parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS headers just in case
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  // Server-side Yahoo Finance Search Proxy
  app.get("/api/search", async (req, res) => {
    try {
      const q = req.query.q;
      if (!q) {
        return res.json({ quotes: [] });
      }

      console.log(`Server proxy query: ${q}`);

      const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(String(q))}&quotesCount=10`;
      
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Yahoo Finance fetch failed: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({
          error: `Yahoo API returned HTTP ${response.status}`,
          quotes: []
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error("Failed to fetch from Yahoo Finance:", error);
      return res.status(500).json({
        error: error.message || "Failed to query finance API",
        quotes: []
      });
    }
  });

  // Integrate Vite Dev Server middleware in non-production, static file serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Finance Forge Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
