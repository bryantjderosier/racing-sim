import type { DriverLapAttrs } from '../lap/types.js';
import type { PracticePersonnel } from '../practice/types.js';

const DRIVER_LAP_KEYS = [
	'braking',
	'cornering',
	'traction',
	'tyre_management',
	'wet_driving',
	'composure',
	'focus',
	'aggression'
] as const;

type AttrRow = { attrName: string; currentValue: number };

function attrMap(rows: AttrRow[]): Map<string, number> {
	const m = new Map<string, number>();
	for (const r of rows) m.set(r.attrName, r.currentValue);
	return m;
}

function get(m: Map<string, number>, key: string, fallback = 50): number {
	return m.get(key) ?? fallback;
}

/** Map `attributes` rows (entity_type=driver) → lap engine driver attrs. */
export function attributesToDriverLapAttrs(rows: AttrRow[]): DriverLapAttrs {
	const m = attrMap(rows);
	return {
		braking: get(m, 'braking'),
		cornering: get(m, 'cornering'),
		traction: get(m, 'traction'),
		tyreManagement: get(m, 'tyre_management'),
		wetDriving: get(m, 'wet_driving'),
		composure: get(m, 'composure'),
		focus: get(m, 'focus'),
		aggression: get(m, 'aggression')
	};
}

/** Driver Feedback + race engineer Setup/Analysis → practice personnel. */
export function attributesToPracticePersonnel(
	driverRows: AttrRow[],
	engineerRows: AttrRow[]
): PracticePersonnel {
	const d = attrMap(driverRows);
	const e = attrMap(engineerRows);
	return {
		driverFeedback: get(d, 'feedback'),
		engineerSetup: get(e, 'setup'),
		engineerAnalysis: get(e, 'analysis')
	};
}

export { DRIVER_LAP_KEYS };
