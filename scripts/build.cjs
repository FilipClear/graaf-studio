const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'build');
const files = [
  'index.html', 'work.html', 'book.html', 'styles.css',
  'app.js', 'media.js', 'booking.js', 'pills.js',
  'achievements.js', 'signatures.js', 'pricing.js', 'faq.js', 'work-overlay.js',
];

fs.mkdirSync(output, { recursive: true });
for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else if (entry.isFile()) {
      // Skip unchanged assets; Windows may lock fonts while a preview uses them.
      if (fs.existsSync(to) && fs.readFileSync(from).equals(fs.readFileSync(to))) continue;
      fs.copyFileSync(from, to);
    }
  }
}
copyDirectory(path.join(root, 'assets'), path.join(output, 'assets'));

// Directory indexes preserve /work and /book on ordinary static hosting.
for (const route of ['work', 'book']) {
  const directory = path.join(output, route);
  fs.mkdirSync(directory, { recursive: true });
  fs.copyFileSync(path.join(root, `${route}.html`), path.join(directory, 'index.html'));
}

console.log(`Build ready: ${output}`);
