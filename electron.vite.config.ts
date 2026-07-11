import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
	build: {
		outDir: 'dist-electron',
		emptyOutDir: true,
		target: 'node22',
		minify: false,
		rollupOptions: {
			input: {
				main: resolve('electron/main.ts'),
				preload: resolve('electron/preload.ts'),
				'world-cli': resolve('electron/world/cli.ts'),
				'advance-cli': resolve('electron/game/cli-advance.ts')
			},
			output: {
				entryFileNames: '[name].js',
				format: 'es'
			},
			external: [
				'electron',
				'electron-serve',
				'@duckdb/node-api',
				'@duckdbfan/drizzle-duckdb',
				'drizzle-orm',
				/^node:/
			]
		}
	}
});
