#!/usr/bin/env node
import { spawn } from 'node:child_process';
import electronPath from 'electron';

const child = spawn(electronPath, ['.'], {
	stdio: 'inherit',
	env: {
		...process.env,
		ELECTRON_DEV: '1',
		VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5180'
	}
});

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 0);
});
