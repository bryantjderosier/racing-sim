/** Mulberry32 seeded PRNG */
export function createRng(seed: number) {
	let t = seed >>> 0;
	return {
		next(): number {
			t += 0x6d2b79f5;
			let r = Math.imul(t ^ (t >>> 15), 1 | t);
			r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
			return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
		},
		int(min: number, max: number): number {
			return min + Math.floor(this.next() * (max - min + 1));
		},
		pick<T>(items: T[]): T {
			return items[this.int(0, items.length - 1)]!;
		},
		shuffle<T>(items: T[]): T[] {
			const out = [...items];
			for (let i = out.length - 1; i > 0; i--) {
				const j = this.int(0, i);
				[out[i], out[j]] = [out[j]!, out[i]!];
			}
			return out;
		}
	};
}

export type Rng = ReturnType<typeof createRng>;
