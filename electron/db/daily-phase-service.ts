import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

type Database = ReturnType<typeof drizzle<typeof schema>>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export const DAILY_MAINTENANCE_SCHEMA_VERSION = 'daily-maintenance-v1';

export interface DailyMaintenanceResult {
	phase: 'maintenance';
	worldDate: string;
	driversRecovered: number;
	fatigueRecoveredPoints: number;
	injuriesResolved: number;
	contractsStarting: number;
	contractsEnding: number;
	seatsStarting: number;
	seatsEnding: number;
}

export class DailyPhaseError extends Error {
	readonly code = 'MIGRATION_FAILED' as const;

	constructor(message: string) {
		super(message);
		this.name = 'DailyPhaseError';
	}
}

function parseStoredResult(payload: string): DailyMaintenanceResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch (error) {
		throw new DailyPhaseError(
			`Daily maintenance result is invalid JSON: ${error instanceof Error ? error.message : String(error)}`
		);
	}
	if (
		!parsed ||
		typeof parsed !== 'object' ||
		(parsed as { phase?: unknown }).phase !== 'maintenance'
	) {
		throw new DailyPhaseError('Daily maintenance result has an invalid shape.');
	}
	return parsed as DailyMaintenanceResult;
}

export async function runDailyMaintenance(
	tx: Transaction,
	options: { saveId: string; worldDate: string; now: string }
): Promise<DailyMaintenanceResult> {
	const executionId = `${options.saveId}:daily:${options.worldDate}:maintenance`;
	const existing = await tx
		.select()
		.from(schema.dailyPhaseExecution)
		.where(eq(schema.dailyPhaseExecution.id, executionId))
		.limit(1);
	if (existing[0]?.status === 'completed') {
		if (existing[0].resultSchemaVersion !== DAILY_MAINTENANCE_SCHEMA_VERSION) {
			throw new DailyPhaseError(
				`Unsupported daily maintenance result version: ${existing[0].resultSchemaVersion}.`
			);
		}
		return parseStoredResult(existing[0].resultPayload);
	}

	const healthRows = await tx.select().from(schema.driverHealth);
	let driversRecovered = 0;
	let fatigueRecoveredPoints = 0;
	let injuriesResolved = 0;
	for (const health of healthRows) {
		const nextFatigue = Math.max(0, health.fatigue - 1);
		const nextInjuryDays = Math.max(0, health.injuryDaysRemaining - 1);
		const nextSeverity = nextInjuryDays === 0 ? 'healthy' : health.injurySeverity;
		if (
			nextFatigue !== health.fatigue ||
			nextInjuryDays !== health.injuryDaysRemaining ||
			nextSeverity !== health.injurySeverity
		) {
			await tx
				.update(schema.driverHealth)
				.set({
					fatigue: nextFatigue,
					injuryDaysRemaining: nextInjuryDays,
					injurySeverity: nextSeverity
				})
				.where(eq(schema.driverHealth.driverId, health.driverId));
		}
		if (nextFatigue < health.fatigue) {
			driversRecovered += 1;
			fatigueRecoveredPoints += health.fatigue - nextFatigue;
		}
		if (health.injuryDaysRemaining > 0 && nextInjuryDays === 0) injuriesResolved += 1;
	}

	const [contractsStarting, contractsEnding, seatsStarting, seatsEnding] = await Promise.all([
		tx
			.select({ id: schema.driverContract.id })
			.from(schema.driverContract)
			.where(eq(schema.driverContract.startDate, options.worldDate)),
		tx
			.select({ id: schema.driverContract.id })
			.from(schema.driverContract)
			.where(
				and(
					eq(schema.driverContract.endDate, options.worldDate),
					isNull(schema.driverContract.terminatedDate)
				)
			),
		tx
			.select({ id: schema.seatAssignment.id })
			.from(schema.seatAssignment)
			.where(eq(schema.seatAssignment.startDate, options.worldDate)),
		tx
			.select({ id: schema.seatAssignment.id })
			.from(schema.seatAssignment)
			.where(eq(schema.seatAssignment.endDate, options.worldDate))
	]);

	const result: DailyMaintenanceResult = {
		phase: 'maintenance',
		worldDate: options.worldDate,
		driversRecovered,
		fatigueRecoveredPoints,
		injuriesResolved,
		contractsStarting: contractsStarting.length,
		contractsEnding: contractsEnding.length,
		seatsStarting: seatsStarting.length,
		seatsEnding: seatsEnding.length
	};
	const stored = {
		status: 'completed',
		resultPayload: JSON.stringify(result),
		resultSchemaVersion: DAILY_MAINTENANCE_SCHEMA_VERSION,
		completedAt: options.now
	};
	if (existing[0]) {
		await tx
			.update(schema.dailyPhaseExecution)
			.set(stored)
			.where(eq(schema.dailyPhaseExecution.id, executionId));
	} else {
		await tx.insert(schema.dailyPhaseExecution).values({
			id: executionId,
			worldDate: options.worldDate,
			phase: 'maintenance',
			...stored,
			createdAt: options.now
		});
	}
	return result;
}
