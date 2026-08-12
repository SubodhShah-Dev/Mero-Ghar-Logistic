// Regenerates backend/schema.sql (MySQL) from the single source of truth in
// config/schema.js.
// Run: node scripts/export-schema.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ddlFor } from '../config/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '..');

const header =
	`-- Auto-generated from backend/config/schema.js (do not edit by hand).\n` +
	`-- Run \`node scripts/export-schema.js\` to regenerate.\n` +
	`-- MySQL dialect.\n\n`;

fs.writeFileSync(path.join(backendDir, 'schema.sql'), header + ddlFor().join('\n\n') + '\n');

console.log('Wrote backend/schema.sql');