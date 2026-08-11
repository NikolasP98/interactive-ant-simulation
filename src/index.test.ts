import { describe, expect, it } from 'vitest';
import { ColonySimulation } from '$lib/simulation';

describe('colony simulation', () => {
	it('keeps the requested population inside the habitat', () => {
		const colony = new ColonySimulation('population-test', { population: 24 });
		for (let frame = 0; frame < 600; frame += 1) colony.update(1 / 60);

		expect(colony.ants).toHaveLength(24);
		for (const ant of colony.ants) {
			expect(Math.abs(ant.x)).toBeLessThan(colony.width / 2);
			expect(Math.abs(ant.z)).toBeLessThan(colony.depth / 2);
		}
	});

	it('clears obsolete food evidence when the food moves', () => {
		const colony = new ColonySimulation('food-test');
		colony.foodTrail[10] = 0.8;
		colony.moveFood(2, -1);

		expect(colony.food).toEqual({ x: 2, z: -1 });
		expect(colony.foodTrail[10]).toBe(0);
	});

	it('preserves home evidence while older field values decay', () => {
		const colony = new ColonySimulation('decay-test', { persistence: 42 });
		colony.homeTrail[0] = 1;
		for (let frame = 0; frame < 120; frame += 1) colony.update(1 / 60);

		expect(colony.homeTrail[0]).toBeLessThan(1);
		expect(Math.max(...colony.homeTrail)).toBeGreaterThan(0.7);
	});
});
