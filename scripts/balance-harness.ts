import {
	BALANCE_VERSION,
	COMBAT_BASE_SUCCESS,
	COMBAT_DEFAULT_LAPS,
	DEFAULT_PIT_LANE_LOSS_S,
	DIVISION_COST_CAP,
	FACILITY_COST_BASE,
	PACE,
	PACE_RISK,
	PIT_TIRE_MS_FAST,
	PIT_TIRE_MS_SLOW,
	SAFETY_DURATION_LAPS,
	WEEKLY_WT_CAP,
	ARCHETYPE_CAP_BUFFER
} from '../electron/sim/balance/index.ts';

function assert(cond: boolean, msg: string) {
	if (!cond) throw new Error(`FAIL: ${msg}`);
	console.log(`  ok — ${msg}`);
}

console.log('══════════════════════════════════════════════════════════════');
console.log(` BALANCE CATALOG  v${BALANCE_VERSION}`);
console.log('══════════════════════════════════════════════════════════════');

assert(BALANCE_VERSION === 1, 'BALANCE_VERSION=1');
assert(typeof PACE.balanced.timeMult === 'number', 'PACE.balanced');
assert(PACE_RISK.maximum > PACE_RISK.conserve, 'PACE_RISK ordering');
assert(DEFAULT_PIT_LANE_LOSS_S === 21, 'pit lane default');
assert(SAFETY_DURATION_LAPS.safety_car >= 2, 'SC duration');
assert(COMBAT_DEFAULT_LAPS >= 1, 'combat default laps');
assert(COMBAT_BASE_SUCCESS.attack_now > 0, 'combat attack base');
assert(PIT_TIRE_MS_FAST < PIT_TIRE_MS_SLOW, 'tire ms window');
assert(DIVISION_COST_CAP[1]! > DIVISION_COST_CAP[3]!, 'div1 cap > div3');
assert(WEEKLY_WT_CAP[1]! > WEEKLY_WT_CAP[3]!, 'WT caps');
assert(Object.keys(FACILITY_COST_BASE).length > 0, 'facility cost base');
assert(!!ARCHETYPE_CAP_BUFFER.aggressive_spender, 'AI archetype buffer');

console.log('\n── Sample rows');
console.log('  PACE.push', PACE.push);
console.log('  COMBAT_BASE_SUCCESS', COMBAT_BASE_SUCCESS);
console.log('  DIVISION_COST_CAP', DIVISION_COST_CAP);
console.log('  WEEKLY_WT_CAP', WEEKLY_WT_CAP);
console.log('  PIT tire ms', { fast: PIT_TIRE_MS_FAST, slow: PIT_TIRE_MS_SLOW });

console.log('\nAll balance checks passed.');
