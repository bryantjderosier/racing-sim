import type { DuckDBConnection } from '@duckdb/node-api';

export function esc(value: string): string {
	return value.replaceAll("'", "''");
}

export function lit(value: string | number | boolean | null): string {
	if (value === null) return 'NULL';
	if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
	if (typeof value === 'number') return String(value);
	return `'${esc(value)}'`;
}

export async function run(conn: DuckDBConnection, sql: string): Promise<void> {
	await conn.run(sql);
}

export async function runMany(conn: DuckDBConnection, statements: string[]): Promise<void> {
	for (const sql of statements) {
		if (sql.trim()) await conn.run(sql);
	}
}
