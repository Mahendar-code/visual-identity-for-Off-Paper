// Writes the opening's timing cues (from src/opening/timeline.js) for the score generator.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './serve.mjs';
import { cues } from '../src/opening/timeline.js';
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'build/cues.json'), JSON.stringify(cues(), null, 2));
console.log(JSON.stringify(cues()));
