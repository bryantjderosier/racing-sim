import type { RegProposal } from './constants.js';
import { PROPOSAL_TEMPLATES } from './constants.js';

function mulberry32(seed: number): () => number {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Draw 3 distinct winter technical proposals for the off-season ballot.
 */
export function generateWinterProposals(
	seasonYear: number,
	rng: () => number = mulberry32(seasonYear * 917)
): RegProposal[] {
	const pool = [...PROPOSAL_TEMPLATES];
	const picked: RegProposal[] = [];
	for (let i = 0; i < 3 && pool.length > 0; i++) {
		const idx = Math.floor(rng() * pool.length);
		const t = pool.splice(idx, 1)[0]!;
		picked.push({
			id: i + 1,
			description: t.description,
			impact: t.impact,
			affectedSlot: t.affectedSlot,
			performancePenaltyPct: t.performancePenaltyPct
		});
	}
	return picked;
}
