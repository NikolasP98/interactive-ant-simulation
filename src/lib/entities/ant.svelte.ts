import { Mob } from '$ents/mob.svelte';
import { world } from '$stores/worldStore.svelte';
import Vector from '$utils/vector.svelte';
import Pheromone from '$ents/pheromone.svelte';

import dbg from '$stores/GUISettings.svelte';
import Food from '$ents/food.svelte';

import type { Pheromone, Vector } from '$types';

enum AntState {
	SEEK = 'seek',
	FOLLOW = 'follow',
	HOME = 'home',
	UNLOAD = 'unload',
	WANDER = 'wander',
	DEAD = 'dead'
}

export default class Ant extends Mob {
	private antSettings = dbg.antSettings;
	// private nearbyFood: Food[] = $state([]);

	private state: AntState = $state(AntState.SEEK);
	private colonyID: string;
	private nearbyPheromones: Pheromone[] = $state([]);
	private nearbyAnts: Ant[] = $state([]);
	private nearbyFood: Food[] = $derived.by(() => {
		let food = world.entities.query(this.position, this.perceptionRadius);

		return food;
	});
	private showRadius: boolean = $state(this.antSettings.showRadius);
	private hasFood: boolean = $state(false);

	private inventory: number = $state(0);
	private perceptionRadius: number = $state(0);
	private strength: number = $state(0);

	constructor(
		x: number,
		y: number,
		settings?: {
			colony: Colony;
			wanderStrength: number;
			steerForce: number;
			perceptionRadius: number;
			showRadius: boolean;
		}
	) {
		super();
		this.colony = this.antSettings.colony;
		this.position = new Vector(x, y);
		this.color = 'white';
		this.showRadius = this.showRadius;
		this.perceptionRadius = this.antSettings.perceptionRadius || 100;

		this.layPheromones();
	}

	layPheromones = () => {
		// setInterval(() => {
		// 	Ant.pheromoneSet.add(
		// 		new Pheromone(
		// 			this.position.x,
		// 			this.position.y,
		// 			this.colony.color,
		// 			this.hasFood ? 'food' : 'home'
		// 		)
		// 	);
		// }, 500);
	};

	seek(target: Vector) {
		const desiredVelocity = target.subtract(this.position);
		desiredVelocity.normalize();
		desiredVelocity.multiply(this.maxSpeed);
		const steerForce = desiredVelocity.subtract(this.velocity);
		steerForce.limit(this.maxForce);
		this.acceleration.add(steerForce);
	}

	unload = () => {
		if (!this.hasFood) return;

		this.hasFood = false;
		this.color = this.colony.color || 'white';
		this.colony.foodCount++;

		this.inventory = null;
	};

	getFood = () => {
		if (this.hasFood) return new Vector();
		if (!this.nearbyFood.length) return new Vector();

		let best = new Vector();
		let dist = 99999;

		for (const food of this.nearbyFood) {
			const d = this.position.distance(food.position);
			if (d < this.antSettings.perceptionRadius && !food.held) {
				if (d < dist) {
					dist = d;
					best = food.position;
				}
				if (dist <= 10) {
					this.pickup(food);
					break;
				}
			}
		}

		if (dist < this.antSettings.perceptionRadius) {
			return this.seek(best);
		}

		return this.followPheromone('food');
	};

	followPheromone = (type) => {
		if (!this.nearbyPheromones.length) return new Vector();
		const bestPheromone = Array.from(this.nearbyPheromones).reduce((a, b) => {
			const d = this.position.distance(a.position);
			const d2 = this.position.distance(b.position);
			return d < d2 ? a : b;
		});
		return this.seek(bestPheromone.position);
	};

	findHome = () => {
		// if (!this.nearbyPheromones.length) return new Vector();
		const homeDist = this.position.distance(this.colony.position);
		if (homeDist < this.antSettings.perceptionRadius) {
			if (homeDist < 10) {
				this.unload();
			}
			return this.seek(this.colony.position);
		}

		return this.followPheromone('home');
	};

	edges() {
		if (this.position.x > canvas.width) {
			this.position.x = 0;
		} else if (this.position.x < 0) {
			this.position.x = canvas.width;
		}
		if (this.position.y > canvas.height) {
			this.position.y = 0;
		} else if (this.position.y < 0) {
			this.position.y = canvas.height;
		}
	}

	update(ctx) {
		const nextStates: { [key: string]: string } = {
			seek: 'follow',
			follow: 'home',
			home: 'unload',
			unload: 'seek'
		};

		const actions: { [key: string]: () => Vector } = {
			wander: () => this.wander(),
			seek: () => this.getFood(),
			follow: () => this.followPheromone('food'),
			home: () => this.findHome(),
			unload: () => {
				this.unload();
				return new Vector();
			}
		};

		// const nextVelocity = actions[this.state]();
		this.velocity = actions['wander']();

		// console.log(`${this.state} ${nextVelocity.x} ${nextVelocity.y}`);

		// if (nextVelocity.x === 0 && nextVelocity.y === 0) {
		// 	this.state = nextStates[this.state];
		// }

		this.theta = this.velocity.angle;
		this.step();

		this.show(ctx);
	}

	wander = (): Vector => {
		const wanderCircleDistance = 50;
		const wanderCircleRadius = 20;

		const circleCenter = this.velocity.clone().normalize().multiply(wanderCircleDistance);

		const angleChange = (Math.random() - 0.5) * 0.3;
		this.theta += angleChange;

		const wanderForce = new Vector(
			Math.cos(this.theta) * wanderCircleRadius,
			Math.sin(this.theta) * wanderCircleRadius
		);

		const wanderDirection = circleCenter.add(wanderForce).normalize();

		return wanderDirection;
	};

	private show = (ctx: CanvasRenderingContext2D): void => {
		if (this.antSettings.showRadius) {
			ctx.strokeStyle = 'rgba(255,255,255, 0.5)';

			ctx.beginPath();
			ctx.arc(this.position.x, this.position.y, this.antSettings.perceptionRadius, 0, 2 * Math.PI);
			ctx.closePath();
			ctx.stroke();
		}

		// ctx.fillStyle = this.color;
		ctx.fillStyle = '#fff';
		ctx.strokeStyle = '#000';

		ctx.beginPath();
		ctx.save();
		ctx.translate(this.position.x, this.position.y);
		ctx.rotate(this.theta);
		ctx.moveTo(-this.radius, -this.radius / 1.5);
		ctx.lineTo(-this.radius, this.radius / 1.5);
		ctx.lineTo(this.radius, 0);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();

		ctx.restore();
	};
}
