import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const memoryPath = path.join(__dirname, '..', 'data', 'memory.json');
const resonancePath = path.join(__dirname, '..', 'data', 'resonance.json');

function ensureFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf8');
  }
}

export function readMemory() {
  ensureFile(memoryPath, { users: {}, capsules: {} });
  return JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
}

export function writeMemory(data) {
  fs.writeFileSync(memoryPath, JSON.stringify(data, null, 2), 'utf8');
}

export function readResonance() {
  ensureFile(resonancePath, { clips: [] });
  return JSON.parse(fs.readFileSync(resonancePath, 'utf8'));
}

export function writeResonance(data) {
  fs.writeFileSync(resonancePath, JSON.stringify(data, null, 2), 'utf8');
}
