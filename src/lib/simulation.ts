export type ColonySettings = {
	population: number;
	persistence: number;
	speed: number;
};

export type AntAgent = {
	x: number;
	z: number;
	angle: number;
	phase: number;
	hasFood: boolean;
	wanderSeed: number;
	trailClock: number;
};

const TAU = Math.PI * 2;

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
	food = { x: 5.2, z: -2.1 };
	settings: ColonySettings;
	ants: AntAgent[] = [];
	homeTrail = new Float32Array(this.columns * this.rows);
	foodTrail = new Float32Array(this.columns * this.rows);
	deliveries = 0;
	elapsed = 0;

	private random: () => number;
	private fieldClock = 0;

	constructor(seed = 'pinonite-ant-colony', settings?: Partial<ColonySettings>) {
		this.random = mulberry32(hashSeed(seed));
		this.settings = {
			population: settings?.population ?? 52,
			persistence: settings?.persistence ?? 68,
			speed: settings?.speed ?? 1
		};
		this.seedNest();
		this.resizePopulation(this.settings.population);
	}

	reset(): void {
		this.ants = [];
		this.homeTrail.fill(0);
		this.foodTrail.fill(0);
		this.deliveries = 0;
		this.elapsed = 0;
		this.fieldClock = 0;
		this.seedNest();
		this.resizePopulation(this.settings.population);
	}

	moveFood(x: number, z: number): void {
		this.food.x = Math.max(-this.width / 2 + 0.8, Math.min(this.width / 2 - 0.8, x));
		this.food.z = Math.max(-this.depth / 2 + 0.8, Math.min(this.depth / 2 - 0.8, z));
		this.foodTrail.fill(0);
	}

	resizePopulation(population: number): void {
		this.settings.population = Math.max(8, Math.min(120, Math.round(population)));
		while (this.ants.length < this.settings.population) this.ants.push(this.createAnt());
		if (this.ants.length > this.settings.population) this.ants.length = this.settings.population;
	}

	update(deltaSeconds: number): void {
		const dt = Math.min(0.04, Math.max(0, deltaSeconds)) * this.settings.speed;
		if (!dt) return;
		this.elapsed += dt;
		this.fieldClock += dt;

		if (this.fieldClock > 0.11) {
			const decay = Math.pow(0.997 - (100 - this.settings.persistence) * 0.00012, this.fieldClock * 60);
			for (let index = 0; index < this.homeTrail.length; index += 1) {
				this.homeTrail[index] *= decay;
				this.foodTrail[index] *= decay;
			}
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
			wanderSeed: this.random() * 100,
			trailClock: this.random() * 0.16
		};
	}

	private updateAnt(ant: AntAgent, dt: number): void {
		ant.phase += dt * (8.5 + ant.wanderSeed % 2);
		const goal = ant.hasFood ? this.nest : this.food;
		const distanceToGoal = Math.hypot(goal.x - ant.x, goal.z - ant.z);
		let desired = ant.angle;

		if (distanceToGoal < (ant.hasFood ? 2.1 : 1.3)) {
			desired = Math.atan2(goal.z - ant.z, goal.x - ant.x);
		} else {
			const field = ant.hasFood ? this.homeTrail : this.foodTrail;
			const sensorDistance = 0.76;
			const candidates = [-0.68, -0.28, 0, 0.28, 0.68].map((offset) => {
				const direction = ant.angle + offset;
				const sample = this.sampleField(
					field,
					ant.x + Math.cos(direction) * sensorDistance,
					ant.z + Math.sin(direction) * sensorDistance
				);
				const forwardBias = 1 - Math.abs(offset) * 0.11;
				return { direction, score: sample * forwardBias + this.random() * 0.018 };
			});
			candidates.sort((a, b) => b.score - a.score);
			if (candidates[0].score > 0.035) {
				desired = candidates[0].direction;
			} else {
				desired +=
					Math.sin(this.elapsed * 0.92 + ant.wanderSeed) * 0.34 +
					(this.random() - 0.5) * 0.42;
			}
		}

		const edgeX = this.width / 2 - 0.48;
		const edgeZ = this.depth / 2 - 0.48;
		if (Math.abs(ant.x) > edgeX || Math.abs(ant.z) > edgeZ) {
			desired = Math.atan2(-ant.z, -ant.x);
		}
		ant.angle += Math.max(-2.7 * dt, Math.min(2.7 * dt, shortestAngle(ant.angle, desired)));

		const stride = 1.18 * dt;
		ant.x += Math.cos(ant.angle) * stride;
		ant.z += Math.sin(ant.angle) * stride;
		ant.x = Math.max(-edgeX, Math.min(edgeX, ant.x));
		ant.z = Math.max(-edgeZ, Math.min(edgeZ, ant.z));

		ant.trailClock -= dt;
		if (ant.trailClock <= 0) {
			this.deposit(ant.hasFood ? this.foodTrail : this.homeTrail, ant.x, ant.z, ant.hasFood ? 0.22 : 0.13);
			ant.trailClock = 0.12 + this.random() * 0.055;
		}

		if (!ant.hasFood && distanceToGoal < 0.42) {
			ant.hasFood = true;
			ant.angle += Math.PI;
		} else if (ant.hasFood && distanceToGoal < 0.56) {
			ant.hasFood = false;
			ant.angle += Math.PI;
			this.deliveries += 1;
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

	private sampleField(field: Float32Array, x: number, z: number): number {
		return field[this.indexFor(x, z)] ?? 0;
	}

	private deposit(field: Float32Array, x: number, z: number, amount: number): void {
		const index = this.indexFor(x, z);
		field[index] = Math.min(1, field[index] + amount);
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
