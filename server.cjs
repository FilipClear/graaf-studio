const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { gzip } = require('node:zlib');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  let requested;
  try { requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const routes = { '/': 'index.html', '/work': 'work.html', '/work/': 'work.html', '/book': 'book.html', '/book/': 'book.html' };
  const name = routes[requested] || requested.slice(1);
  if (!['index.html', 'work.html', 'book.html', 'styles.css', 'app.js', 'media.js', 'booking.js', 'pills.js', 'achievements.js', 'signatures.js', 'pricing.js', 'faq.js', 'work-overlay.js'].includes(name) && !/^assets\/[\w.-]+$/.test(name)) {
    res.writeHead(404).end('Not found'); return;
  }
  const filename = path.join(__dirname, name);
  fs.stat(filename, (error, stat) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    const extension = path.extname(name);
    const headers = {
      'Content-Type': types[extension] || 'application/octet-stream',
      'Cache-Control': name.startsWith('assets/') ? 'public, max-age=86400' : 'no-cache',
      'ETag': `W/"${stat.size}-${stat.mtimeMs}"`,
      'Vary': 'Accept-Encoding',
    };
    if (req.headers['if-none-match'] === headers.ETag) {
      res.writeHead(304, headers).end(); return;
    }
    fs.readFile(filename, (readError, content) => {
      if (readError) { res.writeHead(404).end('Not found'); return; }
      const send = body => {
        res.writeHead(200, { ...headers, 'Content-Length': body.length });
        res.end(body);
      };
      if (/\bgzip\b/.test(req.headers['accept-encoding'] || '') && ['.html', '.css', '.js', '.svg', '.ttf'].includes(extension)) {
        gzip(content, (compressionError, compressed) => {
          if (compressionError) { send(content); return; }
          headers['Content-Encoding'] = 'gzip';
          send(compressed);
        });
      } else send(content);
    });
  });
}).listen(5173, '127.0.0.1', () => console.log('Graaf preview: http://127.0.0.1:5173'));
