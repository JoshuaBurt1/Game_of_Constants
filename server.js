import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Modified static serving to handle PWA Service Worker headers
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    // Crucial: sw.js must NEVER be cached by the browser
    if (path.basename(filePath) === 'sw.js') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// 2. API Endpoint for Highscores
app.get('/api/highscores', (req, res) => {
  res.json([{ name: "Player1", score: 1000 }]);
});

// 3. Catch-all: Using Regex literal for SPA routing
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `Server is live!`);
  console.log(`Local:   http://localhost:${PORT}`);
});