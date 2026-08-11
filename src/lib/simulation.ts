export type Temperament = 'curious' | 'adaptive' | 'disciplined';
export type AntAction = 'forage' | 'pickup' | 'carry' | 'unload';

export type ColonySettings = {
	population: number;
	persistence: number;
	diffusion: number;
	speed: number;
	temperament: Temperament;
};

export type FoodSource = {
	id: string;
	label: string;
	x: number;
	z: number;
	value: number;
	color: string;
	movable: boolean;
};

export type Obstacle = {
	id: string;
	x: number;
	z: number;
	radius: number;
	kind: 'rock' | 'log';
};

export type AntAgent = {
	x: number;
	z: number;
	angle: number;
	phase: number;
	hasFood: boolean;
	carryingFoodId: string | null;
	carryingValue: number;
	wanderSeed: number;
	trailClock: number;
	action: AntAction;
	actionClock: number;
	actionDuration: number;
	actionProgress: number;
};

type TemperamentProfile = {
	wander: number;
	signalWeight: number;
	turnRate: number;
	stride: number;
	sensorDistance: number;
	threshold: number;
};

const TAU = Math.PI * 2;
const TEMPERAMENTS: Record<Temperament, TemperamentProfile> = {
	curious: {
		wander: 1.48,
		signalWeight: 0.76,
		turnRate: 3.1,
		stride: 1.16,
		sensorDistance: 0.68,
		threshold: 0.052
	},
	adaptive: {
		wander: 1,
		signalWeight: 1,
		turnRate: 2.75,
		stride: 1.08,
		sensorDistance: 0.78,
		threshold: 0.035
	},
	disciplined: {
		wander: 0.54,
		signalWeight: 1.38,
		turnRate: 2.35,
		stride: 1,
		sensorDistance: 0.86,
		threshold: 0.022
	}
};

function hashSeed(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function mulberry32(seed: number): () => number {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function shortestAngle(from: number, to: number): number {
	return ((to - from + Math.PI * 3) % TAU) - Math.PI;
}

export class ColonySimulation {
	readonly width = 18;
	readonly depth = 12;
	readonly columns = 72;
	readonly rows = 48;
	readonly nest = { x: -5.4, z: 2.25 };
	readonly foods: FoodSource[] = [
		{
			id: 'meadow',
			label: 'NEAR CRUMBS · 1×',
			x: 0.65,
			z: 3.25,
			value: 1,
			color: '#e5c64f',
			movable: false
		},
		{
			id: 'orchard',
			label: 'RICH FRUIT · 3×',
			x: 5.2,
			z: -2.1,
			value: 3,
			color: '#c96043',
			movable: true
		}
	];
	readonly obstacles: Obstacle[] = [];
	settings: ColonySettings;
	ants: AntAgent[] = [];
	homeTrail = new Float32Array(this.columns * this.rows);
	foodTrail = new Float32Array(this.columns * this.rows);
	deliveries = 0;
	harvestValue = 0;
	elapsed = 0;

	private random: () => number;
	private fieldClock = 0;
	private nextHomeTrail = new Float32Array(this.columns * this.rows);
	private nextFoodTrail = new Float32Array(this.columns * this.rows);
	private obstacleSerial = 0;

	constructor(seed = 'pinonite-ant-colony', settings?: Partial<ColonySettings>) {
		this.random = mulberry32(hashSeed(seed));
		this.settings = {
			population: settings?.population ?? 52,
			persistence: settings?.persistence ?? 68,
			diffusion: settings?.diffusion ?? 46,
			speed: settings?.speed ?? 1,
			temperament: settings?.temperament ?? 'adaptive'
		};
		this.seedNest();
		this.resizePopulation(this.settings.population);
	}

	get food(): FoodSource {
		return this.foods.find((food) => food.movable) ?? this.foods[0];
	}

	reset(): void {
		this.ants = [];
		this.homeTrail.fill(0);
		this.foodTrail.fill(0);
		this.nextHomeTrail.fill(0);
		this.nextFoodTrail.fill(0);
		this.obstacles.length = 0;
		this.deliveries = 0;
		this.harvestValue = 0;
		this.elapsed = 0;
		this.fieldClock = 0;
		this.seedNest();
		this.resizePopulation(this.settings.population);
	}

	moveFood(x: number, z: number): void {
		const food = this.food;
		food.x = Math.max(-this.width / 2 + 0.8, Math.min(this.width / 2 - 0.8, x));
		food.z = Math.max(-this.depth / 2 + 0.8, Math.min(this.depth / 2 - 0.8, z));
		for (let index = 0; index < this.foodTrail.length; index += 1) this.foodTrail[index] *= 0.28;
	}

	setTemperament(temperament: Temperament): void {
		this.settings.temperament = temperament;
	}

	resizePopulation(population: number): void {
		this.settings.population = Math.max(8, Math.min(120, Math.round(population)));
		while (this.ants.length < this.settings.population) this.ants.push(this.createAnt());
		if (this.ants.length > this.settings.population) this.ants.length = this.settings.population;
	}

	addObstacleOnRoute(): Obstacle | null {
		if (this.obstacles.length >= 3) return null;
		let bestIndex = -1;
		let bestValue = 0;
		for (let index = 0; index < this.foodTrail.length; index += 1) {
			const point = this.pointForIndex(index);
			if (Math.hypot(point.x - this.nest.x, point.z - this.nest.z) < 1.8) continue;
			if (this.foods.some((food) => Math.hypot(point.x - food.x, point.z - food.z) < 1.7)) continue;
			if (this.obstacles.some((obstacle) => Math.hypot(point.x - obstacle.x, point.z - obstacle.z) < 2)) continue;
			const value = this.foodTrail[index] + this.homeTrail[index] * 0.28;
			if (value > bestValue) {
				bestValue = value;
				bestIndex = index;
			}
		}

		let point = bestIndex >= 0 ? this.pointForIndex(bestIndex) : null;
		if (!point || bestValue < 0.045) {
			const food = this.foods[this.obstacles.length % this.foods.length];
			const t = 0.48 + this.obstacles.length * 0.12;
			point = {
				x: this.nest.x + (food.x - this.nest.x) * t,
				z: this.nest.z + (food.z - this.nest.z) * t + (this.obstacles.length % 2 ? 0.8 : -0.6)
			};
		}

		const obstacle: Obstacle = {
			id: `obstacle-${this.obstacleSerial++}`,
			x: point.x,
			z: point.z,
			radius: this.obstacles.length % 2 === 0 ? 0.82 : 0.7,
			kind: this.obstacles.length % 2 === 0 ? 'log' : 'rock'
		};
		this.obstacles.push(obstacle);
		this.eraseTrailAtObstacle(obstacle);
		return obstacle;
	}

	clearObstacles(): void {
		this.obstacles.length = 0;
	}

	update(deltaSeconds: number): void {
		const dt = Math.min(0.04, Math.max(0, deltaSeconds)) * this.settings.speed;
		if (!dt) return;
		this.elapsed += dt;
		this.fieldClock += dt;

		if (this.fieldClock > 0.11) {
			const decay = Math.pow(0.997 - (100 - this.settings.persistence) * 0.00012, this.fieldClock * 60);
			const diffusion = 0.018 + (this.settings.diffusion / 100) * 0.16;
			this.diffuseField(this.homeTrail, this.nextHomeTrail, diffusion, decay);
			this.diffuseField(this.foodTrail, this.nextFoodTrail, diffusion, decay);
			[this.homeTrail, this.nextHomeTrail] = [this.nextHomeTrail, this.homeTrail];
			[this.foodTrail, this.nextFoodTrail] = [this.nextFoodTrail, this.foodTrail];
			this.seedNest();
			this.fieldClock = 0;
		}

		for (const ant of this.ants) this.updateAnt(ant, dt);
	}

	private createAnt(): AntAgent {
		const angle = this.random() * TAU;
		const radius = Math.sqrt(this.random()) * 0.75;
		return {
			x: this.nest.x + Math.cos(angle) * radius,
			z: this.nest.z + Math.sin(angle) * radius,
			angle,
			phase: this.random() * TAU,
			hasFood: false,
			carryingFoodId: null,
			carryingValue: 0,
			wanderSeed: this.random() * 100,
			trailClock: this.random() * 0.16,
			action: 'forage',
			actionClock: 0,
			actionDuration: 0,
			actionProgress: 0
		};
	}

	private updateAnt(ant: AntAgent, dt: number): void {
		ant.phase += dt * (8.5 + ant.wanderSeed % 2);
		if (ant.actionClock > 0) {
			ant.actionClock = Math.max(0, ant.actionClock - dt);
			ant.actionProgress = 1 - ant.actionClock / ant.actionDuration;
			if (ant.actionClock === 0) this.finishAction(ant);
			return;
		}

		const profile = TEMPERAMENTS[this.settings.temperament];
		const visibleFood = ant.hasFood ? null : this.findVisibleFood(ant);
		const goal = ant.hasFood ? this.nest : visibleFood;
		const distanceToGoal = goal ? Math.hypot(goal.x - ant.x, goal.z - ant.z) : Infinity;
		const directPerception = ant.hasFood ? 2.1 : 1.35 + (visibleFood?.value ?? 0) * 0.1;
		let desired = ant.angle;

		if (goal && distanceToGoal < directPerception) {
			desired = Math.atan2(goal.z - ant.z, goal.x - ant.x);
		} else {
			const field = ant.hasFood ? this.homeTrail : this.foodTrail;
			const candidates = [-0.72, -0.32, 0, 0.32, 0.72].map((offset) => {
				const direction = ant.angle + offset;
				const sample = this.sampleField(
					field,
					ant.x + Math.cos(direction) * profile.sensorDistance,
					ant.z + Math.sin(direction) * profile.sensorDistance
				);
				const forwardBias = 1 - Math.abs(offset) * 0.11;
				return {
					direction,
					score: sample * forwardBias * profile.signalWeight + this.random() * 0.018 * profile.wander
				};
			});
			candidates.sort((a, b) => b.score - a.score);
			if (candidates[0].score > profile.threshold) {
				desired = candidates[0].direction;
			} else {
				// Wander is an angular velocity, not a per-frame heading jump. Keeping the
				// perturbation time-scaled prevents new foragers from orbiting the nest.
				desired +=
					(Math.sin(this.elapsed * 0.92 + ant.wanderSeed) * 0.72 +
						(this.random() - 0.5) * 0.9) *
					profile.wander *
					dt;
			}
		}

		desired = this.avoidObstacles(ant, desired);
		const edgeX = this.width / 2 - 0.48;
		const edgeZ = this.depth / 2 - 0.48;
		if (Math.abs(ant.x) > edgeX || Math.abs(ant.z) > edgeZ) desired = Math.atan2(-ant.z, -ant.x);
		ant.angle += Math.max(
			-profile.turnRate * dt,
			Math.min(profile.turnRate * dt, shortestAngle(ant.angle, desired))
		);

		const stride = profile.stride * dt;
		let nextX = ant.x + Math.cos(ant.angle) * stride;
		let nextZ = ant.z + Math.sin(ant.angle) * stride;
		for (const obstacle of this.obstacles) {
			const distance = Math.hypot(nextX - obstacle.x, nextZ - obstacle.z);
			const clearance = obstacle.radius + 0.18;
			if (distance < clearance) {
				const away = Math.atan2(nextZ - obstacle.z, nextX - obstacle.x);
				nextX = obstacle.x + Math.cos(away) * clearance;
				nextZ = obstacle.z + Math.sin(away) * clearance;
				ant.angle = away + (ant.wanderSeed % 2 > 1 ? Math.PI / 2 : -Math.PI / 2);
			}
		}
		ant.x = Math.max(-edgeX, Math.min(edgeX, nextX));
		ant.z = Math.max(-edgeZ, Math.min(edgeZ, nextZ));

		ant.trailClock -= dt;
		if (ant.trailClock <= 0) {
			const amount = ant.hasFood ? 0.16 + ant.carryingValue * 0.055 : 0.13;
			this.deposit(ant.hasFood ? this.foodTrail : this.homeTrail, ant.x, ant.z, amount);
			ant.trailClock = 0.12 + this.random() * 0.055;
		}

		if (!ant.hasFood && visibleFood && distanceToGoal < 0.42) this.startPickup(ant, visibleFood);
		if (ant.hasFood && ant.action === 'carry' && distanceToGoal < 0.56) this.startUnload(ant);
	}

	private findVisibleFood(ant: AntAgent): FoodSource | null {
		let best: FoodSource | null = null;
		let bestScore = Infinity;
		for (const food of this.foods) {
			const distance = Math.hypot(food.x - ant.x, food.z - ant.z);
			const perception = 1.3 + food.value * 0.08;
			if (distance > perception) continue;
			const score = distance / (1 + food.value * 0.12);
			if (score < bestScore) {
				best = food;
				bestScore = score;
			}
		}
		return best;
	}

	private startPickup(ant: AntAgent, food: FoodSource): void {
		ant.hasFood = true;
		ant.carryingFoodId = food.id;
		ant.carryingValue = food.value;
		ant.action = 'pickup';
		ant.actionDuration = 0.42;
		ant.actionClock = ant.actionDuration;
		ant.actionProgress = 0;
	}

	private startUnload(ant: AntAgent): void {
		if (ant.action === 'unload') return;
		ant.action = 'unload';
		ant.actionDuration = 0.5;
		ant.actionClock = ant.actionDuration;
		ant.actionProgress = 0;
	}

	private finishAction(ant: AntAgent): void {
		if (ant.action === 'pickup') {
			ant.action = 'carry';
			ant.angle += Math.PI;
			return;
		}
		if (ant.action === 'unload') {
			this.deliveries += 1;
			this.harvestValue += ant.carryingValue;
			ant.hasFood = false;
			ant.carryingFoodId = null;
			ant.carryingValue = 0;
			ant.action = 'forage';
			ant.angle += Math.PI;
		}
	}

	private avoidObstacles(ant: AntAgent, desired: number): number {
		for (const obstacle of this.obstacles) {
			const probeX = ant.x + Math.cos(ant.angle) * 0.72;
			const probeZ = ant.z + Math.sin(ant.angle) * 0.72;
			if (Math.hypot(probeX - obstacle.x, probeZ - obstacle.z) > obstacle.radius + 0.42) continue;
			const away = Math.atan2(ant.z - obstacle.z, ant.x - obstacle.x);
			const side = ant.wanderSeed % 2 > 1 ? 1 : -1;
			return away + side * Math.PI * 0.56;
		}
		return desired;
	}

	private diffuseField(
		field: Float32Array,
		target: Float32Array,
		diffusion: number,
		decay: number
	): void {
		for (let row = 0; row < this.rows; row += 1) {
			for (let column = 0; column < this.columns; column += 1) {
				const index = row * this.columns + column;
				const point = this.pointForIndex(index);
				if (this.obstacles.some((obstacle) => Math.hypot(point.x - obstacle.x, point.z - obstacle.z) < obstacle.radius)) {
					target[index] = 0;
					continue;
				}
				const left = field[row * this.columns + Math.max(0, column - 1)];
				const right = field[row * this.columns + Math.min(this.columns - 1, column + 1)];
				const up = field[Math.max(0, row - 1) * this.columns + column];
				const down = field[Math.min(this.rows - 1, row + 1) * this.columns + column];
				const neighborAverage = (left + right + up + down) * 0.25;
				target[index] = Math.max(0, (field[index] + (neighborAverage - field[index]) * diffusion) * decay);
			}
		}
	}

	private indexFor(x: number, z: number): number {
		const column = Math.max(
			0,
			Math.min(this.columns - 1, Math.floor(((x + this.width / 2) / this.width) * this.columns))
		);
		const row = Math.max(
			0,
			Math.min(this.rows - 1, Math.floor(((z + this.depth / 2) / this.depth) * this.rows))
		);
		return row * this.columns + column;
	}

	private pointForIndex(index: number): { x: number; z: number } {
		const column = index % this.columns;
		const row = Math.floor(index / this.columns);
		return {
			x: -this.width / 2 + ((column + 0.5) / this.columns) * this.width,
			z: -this.depth / 2 + ((row + 0.5) / this.rows) * this.depth
		};
	}

	private sampleField(field: Float32Array, x: number, z: number): number {
		return field[this.indexFor(x, z)] ?? 0;
	}

	private deposit(field: Float32Array, x: number, z: number, amount: number): void {
		if (this.obstacles.some((obstacle) => Math.hypot(x - obstacle.x, z - obstacle.z) < obstacle.radius)) return;
		const index = this.indexFor(x, z);
		field[index] = Math.min(1, field[index] + amount);
	}

	private eraseTrailAtObstacle(obstacle: Obstacle): void {
		for (let index = 0; index < this.homeTrail.length; index += 1) {
			const point = this.pointForIndex(index);
			if (Math.hypot(point.x - obstacle.x, point.z - obstacle.z) > obstacle.radius * 1.1) continue;
			this.homeTrail[index] = 0;
			this.foodTrail[index] = 0;
		}
	}

	private seedNest(): void {
		const center = this.indexFor(this.nest.x, this.nest.z);
		this.homeTrail[center] = 1;
		for (const offset of [-1, 1, -this.columns, this.columns]) {
			const index = center + offset;
			if (index >= 0 && index < this.homeTrail.length) this.homeTrail[index] = 0.82;
		}
	}
}
