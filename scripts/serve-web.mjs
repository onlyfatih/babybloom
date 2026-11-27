// Minimal static server with SPA fallback for the exported web preview.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = process.argv[2] ?? 'dist';
const port = Number(process.argv[3] ?? 8081);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.json': 'application/json' };

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(root, url);
  try {
    if (!(await stat(file)).isFile()) throw new Error();
  } catch {
    file = join(root, 'index.html');
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
