import { describe, expect, it } from 'vitest';
import { ColonySimulation } from '$lib/simulation';

describe('colony simulation', () => {
	it('keeps the requested population inside the habitat and outside obstacles', () => {
		const colony = new ColonySimulation('population-test', { population: 24 });
		const obstacle = colony.addObstacleOnRoute();
		for (let frame = 0; frame < 900; frame += 1) colony.update(1 / 60);

		expect(colony.ants).toHaveLength(24);
		expect(obstacle).not.toBeNull();
		for (const ant of colony.ants) {
			expect(Math.abs(ant.x)).toBeLessThan(colony.width / 2);
			expect(Math.abs(ant.z)).toBeLessThan(colony.depth / 2);
			if (obstacle) {
				expect(Math.hypot(ant.x - obstacle.x, ant.z - obstacle.z)).toBeGreaterThan(
					obstacle.radius
				);
			}
		}
	});

	it('keeps two food economies and weakens obsolete evidence when rich food moves', () => {
		const colony = new ColonySimulation('food-test');
		colony.foodTrail[10] = 0.8;
		colony.moveFood(2, -1);

		expect(colony.foods.map((food) => food.value)).toEqual([1, 3]);
		expect(colony.food.x).toBe(2);
		expect(colony.food.z).toBe(-1);
		expect(colony.foodTrail[10]).toBeCloseTo(0.224);
	});

	it('diffuses pheromone evidence into neighboring cells before it decays', () => {
		const colony = new ColonySimulation('diffusion-test', {
			population: 8,
			persistence: 96,
			diffusion: 82
		});
		const center = 20 * colony.columns + 30;
		colony.foodTrail[center] = 1;
		for (let frame = 0; frame < 4; frame += 1) colony.update(0.04);

		expect(colony.foodTrail[center]).toBeLessThan(1);
		expect(colony.foodTrail[center + 1]).toBeGreaterThan(0);
		expect(colony.foodTrail[center + colony.columns]).toBeGreaterThan(0);
	});

	it('animates pickup and unload while crediting richer food by value', () => {
		const colony = new ColonySimulation('value-test', { population: 8 });
		const ant = colony.ants[0];
		const richFood = colony.foods.find((food) => food.value === 3)!;
		ant.x = richFood.x;
		ant.z = richFood.z;
		colony.update(1 / 60);
		expect(ant.action).toBe('pickup');

		for (let frame = 0; frame < 32; frame += 1) colony.update(1 / 60);
		expect(ant.action).toBe('carry');
		ant.x = colony.nest.x;
		ant.z = colony.nest.z;
		colony.update(1 / 60);
		expect(ant.action).toBe('unload');
		for (let frame = 0; frame < 40; frame += 1) colony.update(1 / 60);

		expect(colony.deliveries).toBeGreaterThanOrEqual(1);
		expect(colony.harvestValue).toBeGreaterThanOrEqual(3);
		expect(ant.hasFood).toBe(false);
	});

	it('switches exploration temperament without resetting the active colony', () => {
		const colony = new ColonySimulation('temperament-test');
		const ants = colony.ants;
		colony.setTemperament('curious');

		expect(colony.settings.temperament).toBe('curious');
		expect(colony.ants).toBe(ants);
	});

	it('lets a fresh colony fan out instead of orbiting the nest', () => {
		const colony = new ColonySimulation('exploration-test', { population: 52 });
		for (let frame = 0; frame < 1_200; frame += 1) colony.update(1 / 60);

		const furthest = Math.max(
			...colony.ants.map((ant) => Math.hypot(ant.x - colony.nest.x, ant.z - colony.nest.z))
		);
		expect(furthest).toBeGreaterThan(3.5);
	});
});
