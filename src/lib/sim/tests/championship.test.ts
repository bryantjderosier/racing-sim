import { describe, expect, test } from 'vitest';
import {
	CHAMPIONSHIP_CODES,
	CHAMPIONSHIP_DISPLAY_NAMES,
	CHAMPIONSHIP_SHORT_CODES
} from '../core/championship';

describe('championship display names', () => {
	test('keeps persisted codes mapped to the approved player-facing names', () => {
		expect(CHAMPIONSHIP_CODES).toEqual(['apex', 'challenger', 'academy']);
		expect(CHAMPIONSHIP_DISPLAY_NAMES).toEqual({
			apex: 'World Formula Championship',
			challenger: 'International Formula Championship',
			academy: 'Formula Development Championship'
		});
		expect(CHAMPIONSHIP_SHORT_CODES).toEqual({ apex: 'WFC', challenger: 'IFC', academy: 'FDC' });
	});
});
