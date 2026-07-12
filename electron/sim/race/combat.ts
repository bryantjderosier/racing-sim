import {
	COMBAT_ATTACK_FAIL_RISK,
	COMBAT_BASE_SUCCESS,
	COMBAT_DEFAULT_LAPS,
	COMBAT_HOLD_DIRTY_AIR,
	COMBAT_TIME_MS
} from '../balance/race.js';
import type { DriverLapAttrs } from '../lap/types.js';

export type CombatOrder = 'hold_traffic' | 'no_fight_teammate' | 'attack_now';

export type ActiveCombat = {
	order: CombatOrder;
	lapsRemaining: number;
	teammateId?: number;
};

export type CombatLapResult = {
	timeDeltaMs: number;
	dirtyAirAdd: number;
	incidentRiskMult: number;
	success: boolean;
	label: string;
};

function clampAttr(n: number): number {
	return Math.max(1, Math.min(99, n));
}

export function resolveCombatAttrs(driver: DriverLapAttrs, extras?: {
	overtaking?: number;
	defending?: number;
}) {
	return {
		aggression: clampAttr(driver.aggression),
		overtaking: clampAttr(extras?.overtaking ?? driver.aggression),
		defending: clampAttr(extras?.defending ?? driver.composure)
	};
}

/**
 * Light combat resolution for one lap while an override is active.
 */
export function resolveCombatLap(args: {
	combat: ActiveCombat;
	driver: DriverLapAttrs;
	overtaking?: number;
	defending?: number;
	rng: () => number;
}): CombatLapResult {
	const attrs = resolveCombatAttrs(args.driver, {
		overtaking: args.overtaking,
		defending: args.defending
	});
	const order = args.combat.order;
	const base = COMBAT_BASE_SUCCESS[order];
	let chance = base;
	if (order === 'hold_traffic') {
		chance *= 0.7 + attrs.defending / 200;
	} else if (order === 'no_fight_teammate') {
		chance *= 0.75 + (99 - attrs.aggression) / 250;
	} else {
		chance *= 0.65 + attrs.overtaking / 180 + attrs.aggression / 300;
	}
	chance = Math.max(0.08, Math.min(0.92, chance));
	const success = args.rng() < chance;

	if (order === 'hold_traffic') {
		return {
			success,
			timeDeltaMs: success
				? COMBAT_TIME_MS.hold_traffic_success
				: COMBAT_TIME_MS.hold_traffic_fail,
			dirtyAirAdd: success ? COMBAT_HOLD_DIRTY_AIR : 0,
			incidentRiskMult: 1,
			label: success ? 'held_traffic' : 'failed_hold'
		};
	}
	if (order === 'no_fight_teammate') {
		return {
			success,
			timeDeltaMs: success
				? COMBAT_TIME_MS.no_fight_success
				: COMBAT_TIME_MS.no_fight_fail,
			dirtyAirAdd: 0,
			incidentRiskMult: success ? 0.9 : 1.1,
			label: success ? 'obeyed_team_order' : 'ignored_team_order'
		};
	}
	return {
		success,
		timeDeltaMs: success ? COMBAT_TIME_MS.attack_success : COMBAT_TIME_MS.attack_fail,
		dirtyAirAdd: 0,
		incidentRiskMult: success ? 1 : COMBAT_ATTACK_FAIL_RISK,
		label: success ? 'overtake_attempt_ok' : 'overtake_attempt_failed'
	};
}

export function createCombat(
	order: CombatOrder,
	opts?: { laps?: number; teammateId?: number }
): ActiveCombat {
	return {
		order,
		lapsRemaining: opts?.laps ?? COMBAT_DEFAULT_LAPS,
		teammateId: opts?.teammateId
	};
}
