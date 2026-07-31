export function argumentValue(name: string, fallback: string): string {
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

export function integerArgument(name: string, fallback: number): number {
	const value = Number.parseInt(argumentValue(name, String(fallback)), 10);
	if (!Number.isInteger(value) || value < 1)
		throw new Error(`--${name} must be a positive integer`);
	return value;
}
