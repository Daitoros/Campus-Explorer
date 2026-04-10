import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "db.json");

// Helper to read/write local DB
async function getLocalData() {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveLocalData(data: any) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure db.json exists
  try {
    await fs.access(DB_PATH);
  } catch {
    await saveLocalData([]);
  }

  // API Route to fetch activities
  app.get("/api/atividades", async (req, res) => {
    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (scriptUrl) {
      try {
        const response = await fetch(scriptUrl);
        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        }
      } catch (error) {
        console.error("Error fetching from Google Script, falling back to local:", error);
      }
    }

    // Fallback to local data
    const data = await getLocalData();
    res.json(data);
  });

  // API Route to save or update an activity
  app.post("/api/atividades", express.json(), async (req, res) => {
    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    const activity = req.body;
    
    let data = await getLocalData();
    const existingIndex = activity.id ? data.findIndex((a: any) => a.id === activity.id) : -1;
    const action = existingIndex !== -1 ? 'edit' : 'add';

    if (scriptUrl) {
      try {
        const response = await fetch(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...activity, action }),
        });
        if (response.ok) {
          // If Google Script succeeds, we still update local cache
          if (existingIndex !== -1) {
            data[existingIndex] = activity;
          } else {
            if (!activity.id) activity.id = Date.now().toString();
            data.push(activity);
          }
          await saveLocalData(data);
          const result = await response.json();
          return res.json(result);
        }
      } catch (error) {
        console.error("Error saving to Google Script, falling back to local:", error);
      }
    }

    // Fallback to local data
    if (existingIndex !== -1) {
      data[existingIndex] = activity;
    } else {
      if (!activity.id) activity.id = Date.now().toString();
      data.push(activity);
    }
    await saveLocalData(data);
    res.json({ status: "success", activity });
  });

  // API Route to delete an activity
  app.post("/api/atividades/delete", express.json(), async (req, res) => {
    const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    const { id } = req.body;

    if (scriptUrl) {
      try {
        const response = await fetch(scriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...req.body, action: 'delete' }),
        });
        if (response.ok) {
          // Update local cache
          let data = await getLocalData();
          data = data.filter((a: any) => a.id !== id);
          await saveLocalData(data);
          const result = await response.json();
          return res.json(result);
        }
      } catch (error) {
        console.error("Error deleting from Google Script, falling back to local:", error);
      }
    }

    // Fallback to local data
    let data = await getLocalData();
    
    // If we are deleting a local, we should also clear the localPaiId from linked activities
    data = data.map((a: any) => {
      if (a.localPaiId === id) {
        return { ...a, localPaiId: undefined, local: "Campus" };
      }
      return a;
    });

    data = data.filter((a: any) => a.id !== id);
    await saveLocalData(data);
    res.json({ status: "success" });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
