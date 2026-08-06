// Regenerates backend/schema.sql (MySQL) and backend/schema.sqlite.sql (SQLite)
// from the single source of truth in config/schema.js.
// Run: node scripts/export-schema.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ddlFor } from '../config/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '..');

const header = (dialect) =>
	`-- Auto-generated from backend/config/schema.js (do not edit by hand).\n` +
	`-- Run \`node scripts/export-schema.js\` to regenerate.\n` +
	`-- ${dialect} dialect.\n\n`;

const build = (dialect) =>
	header(dialect) + ddlFor(dialect).join('\n\n') + '\n';

fs.writeFileSync(path.join(backendDir, 'schema.sql'), build('mysql'));
fs.writeFileSync(path.join(backendDir, 'schema.sqlite.sql'), build('sqlite'));

console.log('Wrote backend/schema.sql and backend/schema.sqlite.sql');
