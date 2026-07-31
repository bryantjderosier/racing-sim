import { hashString } from './hash';
import type { RngState } from './types';

export const RNG_STREAM_NAMES = [
	'pace_variance',
	'starts',
	'overtaking',
	'incidents',
	'reliability',
	'weather'
] as const;

export type RngStreamName = (typeof RNG_STREAM_NAMES)[number];

function rotateLeft(value: number, shift: number): number {
	return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function seedWord(seed: string, index: number): number {
	const hex = hashString(`${seed}:${index}`);
	return Number.parseInt(hex.slice(index % 2 === 0 ? 0 : 8, index % 2 === 0 ? 8 : 16), 16) >>> 0;
}

export class Xoshiro128ss {
	private state: RngState;

	constructor(seedOrState: string | RngState) {
		this.state =
			typeof seedOrState === 'string'
				? {
						s0: seedWord(seedOrState, 0),
						s1: seedWord(seedOrState, 1),
						s2: seedWord(seedOrState, 2),
						s3: seedWord(seedOrState, 3)
					}
				: { ...seedOrState };
		if ((this.state.s0 | this.state.s1 | this.state.s2 | this.state.s3) === 0) this.state.s0 = 1;
	}

	nextUint32(): number {
		const result = Math.imul(rotateLeft(Math.imul(this.state.s1, 5) >>> 0, 7), 9) >>> 0;
		const temporary = (this.state.s1 << 9) >>> 0;
		this.state.s2 ^= this.state.s0;
		this.state.s3 ^= this.state.s1;
		this.state.s1 ^= this.state.s2;
		this.state.s0 ^= this.state.s3;
		this.state.s2 ^= temporary;
		this.state.s3 = rotateLeft(this.state.s3, 11);
		return result;
	}

	nextFloat(): number {
		return this.nextUint32() / 0x1_0000_0000;
	}

	normalLike(): number {
		let total = 0;
		for (let draw = 0; draw < 6; draw += 1) total += this.nextFloat();
		return (total - 3) / 1.224744871391589;
	}

	serialize(): RngState {
		return { ...this.state };
	}
}

export function createRngStreams(seed: string): Record<RngStreamName, Xoshiro128ss> {
	return Object.fromEntries(
		RNG_STREAM_NAMES.map((name) => [name, new Xoshiro128ss(`${seed}:${name}`)])
	) as Record<RngStreamName, Xoshiro128ss>;
}

export function restoreRngStreams(
	states: Record<string, RngState>
): Record<RngStreamName, Xoshiro128ss> {
	return Object.fromEntries(
		RNG_STREAM_NAMES.map((name) => [name, new Xoshiro128ss(states[name])])
	) as Record<RngStreamName, Xoshiro128ss>;
}
