// Locates the sealed competition input without embedding any machine-specific path.
// Set MAKEFUN_KIT_DIR to an unpacked token-radar-01 kit, or place snapshot.json in ./input/.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const candidates = [
  process.env.MAKEFUN_KIT_DIR && resolve(process.env.MAKEFUN_KIT_DIR, 'input/snapshot.json'),
  process.env.MAKEFUN_KIT_DIR && resolve(process.env.MAKEFUN_KIT_DIR, 'snapshot.json'),
  resolve(import.meta.dirname, '../input/snapshot.json'),
].filter(Boolean);

export const sealedInput = candidates.find((path) => existsSync(path)) ?? null;
export const kitRoot = process.env.MAKEFUN_KIT_DIR ? resolve(process.env.MAKEFUN_KIT_DIR) : null;
export const hasKit = sealedInput !== null;
export const missingInputNote = 'Sealed snapshot not found. Set MAKEFUN_KIT_DIR to the unpacked token-radar-01 kit, or place snapshot.json in ./input/.';