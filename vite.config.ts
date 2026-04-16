import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
//import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";

const LOG_DIR = path.join(process.cwd(), ".manus", "logs");
const MAX_LOG_SIZE_BYTES = 1024 * 1024; // 1MB

function ensureLogDir() {
      if (!fs.existsSync(LOG_DIR)) {
              fs.mkdirSync(LOG_DIR, { recursive: true });
      }
}

//function trimLogFile(logPath: string, maxSize: number) {
    //  if (!fs.existsSync(logPath)) return;
     // const stats = fs.statSync(logPath);
      if (stats.size <= maxSize) return;

  const targetSize = Math.floor(maxSize * 0.6); // Trim to 60% to avoid constant re-trimming
  const lines = fs.readFileSync(logPath, "utf-8").split("\n");
      const keptLines: string[] = [];
      let keptBytes = 0;

  for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i];
          const lineBytes = Buffer.byteLength(line, "utf-8") + 1;
          if (keptBytes + lineBytes > targetSize) break;
          keptLines.unshift(line);
          keptBytes += lineBytes;
  }

//  fs.writeFileSync(logPath, keptLines.join("\n") + "\n", "utf-8");

function writeToLogFile(source: string, entries: any[]) {
      ensureLogDir();
      const logPath = path.join(LOG_DIR, `${source}.log`);
      const lines = entries.map((entry) => {
              const ts = new Date().toISOString();
              return `[${ts}] ${JSON.stringify(entry)}`;
      });
      fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");
      trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

function vitePluginManusDebugCollector(): Plugin {
      return {
              name: "manus-debug-collector",
              transformIndexHtml(html) {
                        if (process.env.NODE_ENV === "production") {
                                    return html;
                        }
                        return {
                                    html,
                                    tags: [
                                        {
                                                        tag: "script",
                                                        attrs: {
                                                                          src: "/__manus__/debug-collector.js",
                                                                          defer: true,
                                                        },
                                                        injectTo: "head",
                                        },
                                                ],
                        };
              },
                    configureServer(server: ViteDevServer) {
        server.middlewares.use("/__manus__/logs", (req, res, next) => {
          if (req.method === 'POST') {
             // كود المعالجة هنا
          }
          next();
        });
      }
    }
  ]
});
