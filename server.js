import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Render sets process.env.PORT automatically; locally it defaults to 3000
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, 'dist')));

// 2. API Endpoint for Highscores
app.get('/api/highscores', (req, res) => {
  res.json([{ name: "Player1", score: 1000 }]);
});

// 3. Catch-all: Using Regex literal to avoid PathError in Node 22/Express 5
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  // Outputting the actual local link for easy access
  console.log(`\x1b[32m%s\x1b[0m`, `Server is live!`);
  console.log(`Local:   http://localhost:${PORT}`);
  //console.log(`API:     http://localhost:${PORT}/api/highscores`);
});