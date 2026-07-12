import { RD_CFD_HOUR_CASH, RD_WT_HOUR_CASH } from './constants.js';

/** Liquid + cost-cap cash for allocating WT/CFD hours. */
export function rdTestingCashCost(wtHours: number, cfdHours: number): number {
	return Math.round(
		Math.max(0, wtHours) * RD_WT_HOUR_CASH + Math.max(0, cfdHours) * RD_CFD_HOUR_CASH
	);
}
