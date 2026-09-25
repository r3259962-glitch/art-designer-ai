const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  const raw = decodeURIComponent((req.url || "/").split("?")[0]);
  if (raw === "/health" || raw === "/health/") {
    res.writeHead(200, {"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
    return res.end(JSON.stringify({ok:true, service:"safar-doost"}));
  }

  let requested = raw === "/" ? "/index.html" : raw;
  const safe = path.normalize(requested).replace(/^(\.\.[/\\\\])+/, "");
  const file = path.join(publicDir, safe);

  fs.stat(file, (err, st) => {
    const target = !err && st.isFile() ? file : path.join(publicDir, "index.html");
    fs.readFile(target, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, {"content-type":"text/plain; charset=utf-8"});
        return res.end("Server error");
      }
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, {
        "content-type": mime[ext] || "application/octet-stream",
        "cache-control": ext === ".html" ? "no-cache" : "public, max-age=3600",
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin"
      });
      res.end(data);
    });
  });
});

server.listen(PORT, "0.0.0.0", () => console.log("Safar Doost listening on " + PORT));
