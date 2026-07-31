export function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

export function roundHalfEven(value: number): number {
	const floor = Math.floor(value);
	const fraction = value - floor;
	if (fraction < 0.5) return floor;
	if (fraction > 0.5) return floor + 1;
	return floor % 2 === 0 ? floor : floor + 1;
}

export function mean(values: number[]): number {
	return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

export function variance(values: number[]): number {
	const average = mean(values);
	return mean(values.map((value) => (value - average) ** 2));
}

export function minimum(values: number[]): number {
	if (values.length === 0) throw new RangeError('minimum requires at least one value');
	return values.reduce((current, value) => Math.min(current, value), Number.POSITIVE_INFINITY);
}

export function maximum(values: number[]): number {
	if (values.length === 0) throw new RangeError('maximum requires at least one value');
	return values.reduce((current, value) => Math.max(current, value), Number.NEGATIVE_INFINITY);
}
