#!/usr/bin/env node
/**
 * drizzle-kit emits Postgres "public".* qualifiers; DuckDB resolves types in the
 * default catalog without a public schema. Strip the qualifier from SQL migrations.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const drizzleDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
const files = (await readdir(drizzleDir)).filter((f) => f.endsWith('.sql'));

let total = 0;
for (const file of files) {
	const path = join(drizzleDir, file);
	const before = await readFile(path, 'utf8');
	const after = before.replaceAll('"public".', '');
	if (after !== before) {
		await writeFile(path, after);
		const n = before.split('"public".').length - 1;
		total += n;
		console.log(`stripped ${n} public. quals from ${file}`);
	}
}
if (total === 0) console.log('No public. qualifiers to strip');
