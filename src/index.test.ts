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

	it('prioritizes food evidence while searching and home evidence while carrying', () => {
		const colony = new ColonySimulation('priority-test', { population: 8 });
		colony.foodTrail.fill(0.72);
		colony.homeTrail.fill(0.84);
		const ant = colony.ants[0];
		ant.x = 0;
		ant.z = 0;
		colony.update(1 / 60);
		expect(ant.sensorKind).toBe('food');

		ant.hasFood = true;
		ant.action = 'carry';
		ant.carryingFoodId = colony.food.id;
		ant.carryingValue = colony.food.value;
		colony.update(1 / 60);
		expect(ant.sensorKind).toBe('home');
	});

	it('reinforces a direct completed route more strongly than a long detour', () => {
		const direct = new ColonySimulation('route-quality-test', { population: 8 });
		const detour = new ColonySimulation('route-quality-test', { population: 8 });
		for (const colony of [direct, detour]) {
			colony.foodTrail.fill(0);
			colony.homeTrail.fill(0.4);
			for (const ant of colony.ants) ant.trailClock = 10;
			const ant = colony.ants[0];
			ant.x = 0;
			ant.z = 0;
			ant.angle = 0;
			ant.hasFood = true;
			ant.action = 'carry';
			ant.carryingFoodId = colony.food.id;
			ant.carryingValue = 3;
			ant.directTripDistance = 10;
			ant.trailClock = 0;
		}
		direct.ants[0].returnDistance = 2;
		detour.ants[0].returnDistance = 18;
		direct.update(1 / 60);
		detour.update(1 / 60);

		expect(Math.max(...direct.foodTrail)).toBeGreaterThan(Math.max(...detour.foodTrail));
	});

	it('reflects and recovers before an ant can pace along the field edge', () => {
		const colony = new ColonySimulation('edge-test', { population: 8 });
		const ant = colony.ants[0];
		ant.x = colony.width / 2 - 0.5;
		ant.z = 0;
		ant.angle = 0;
		for (let frame = 0; frame < 240; frame += 1) colony.update(1 / 60);

		expect(ant.x).toBeLessThan(colony.width / 2 - 1.1);
		expect(Math.max(...colony.warningTrail)).toBeGreaterThan(0);
	});

	it('marks an unrewarding signal and exits it instead of following forever', () => {
		const colony = new ColonySimulation('false-signal-test', {
			population: 8,
			temperament: 'disciplined'
		});
		colony.foods[0].x = -8;
		colony.foods[0].z = -5;
		colony.food.x = 8;
		colony.food.z = 5;
		colony.foodTrail.fill(0.64);
		let peakWarning = 0;
		for (let frame = 0; frame < 900; frame += 1) {
			colony.update(1 / 60);
			peakWarning = Math.max(peakWarning, ...colony.warningTrail);
		}

		expect(peakWarning).toBeGreaterThan(0.08);
		expect(colony.ants.some((ant) => ant.signalFollowClock < 1)).toBe(true);
	});
});
