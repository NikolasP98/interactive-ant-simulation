import { world } from '$stores/worldStore.svelte';
import Vector from '$utils/vector.svelte';
import Pheromone from '$ents/pheromone.svelte';

import type { Pheromone, Vector } from '$types';

const settings = {
	wanderStrength: 2.5,
	steerForce: 1,

	perceptionRadius: 100,
	showRadius: true
};

export default class Ant {
	static debugger(gui) {
		if (!Ant.debug) {
			Ant.debug = true;
			Pheromone.debugger(gui);
			const antFolder = gui.addFolder('Ant');

			antFolder.add(settings, 'wanderStrength', 0, 5, 0.01).decimals(2);
			antFolder.add(settings, 'steerForce', 0, 5, 0.1);
			antFolder.add(settings, 'perceptionRadius', 20, 200, 10);
			antFolder.add(settings, 'showRadius', true);
		}
	}

	private colonyID: string;

	private nearbyPheromones: Pheromone[] = $state([]);
	private nearbyAnts: Ant[] = $state([]);
	private nearbyFood: Food[] = $state([]);

	private showRadius: boolean = $state(settings.showRadius);
	private hasFood: boolean = $state(false);

	private inventory: number = $state(0);
	private perceptionRadius: number = $state(0);
	private strength: number = $state(0);

	private position: Vector = $state(new Vector());
	private velocity: Vector = $state(new Vector());
	private acceleration: Vector = $state(new Vector());
	private theta: number = $state(0);
	private maxSpeed: number = $state(1);
	private maxForce: number = $state(0.01);

	private radius: number = $state();
	private color: string = $state('#fff');

	private debug: boolean = $state(false);
	constructor(
		x,
		y,
		settings?: {
			colony: Colony;
			wanderStrength: number;
			steerForce: number;
			perceptionRadius: number;
			showRadius: boolean;
		}
	) {
		this.position = new Vector(x, y);

		this.colony = settings.colony;

		this.color = 'white';
		// this.color = this.colony.color || 'white';

		this.showRadius = this.showRadius;
		this.perceptionRadius = 100;

		// this.world.addAnt(this);

		console.log(this);

		this.layPheromones();
	}

	layPheromones() {
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
	}

	/*************  ✨ Codeium Command ⭐  *************/
	/**
	 * Follows the strongest pheromone of the given type within perception radius.
	 * @param pheromones Set of pheromones to search in
	 * @param type Type of pheromone to follow
	 * @returns Steering force to follow the pheromone
	 */
	/******  cc657bb4-6b79-4e9e-965a-e9d698c8d50e  *******/
	followPheromone(pheromones, type) {
		// const getPheromones = Array.from(pheromones).filter((ph) => {
		// 	const d = this.position.dist(ph.position);
		// 	return ph.type == type && d <= settings.perceptionRadius;
		// });
		// if (getPheromones.length) {
		// 	const bestPheromone = getPheromones.reduce((a, b) => {
		// 		return a.lifeTime < b.lifeTime ? a : b;
		// 	});
		// 	return this.seek(bestPheromone.position);
		// }
		// return new Vector();
	}

	seek(target) {
		const desired = Vector.sub(target, this.position);
		desired.normalize().mult(this.maxSpeed);

		const steer = Vector.sub(desired, this.velocity);
		steer.limit(this.maxForce);
		return steer;
	}

	pickup(food) {
		if (this.hasFood) {
			return;
		}
		this.hasFood = true;
		this.color = 'green';
		this.inventory = food;
		food.held = true;
		food.position = this.position;
	}

	unload = () => {
		if (this.hasFood) {
			this.hasFood = false;
			this.color = this.colony.color || 'white';
			this.colony.foodCount++;

			Ant.foodSet.delete(this.inventory) ? Ant.foodSet.has(this.inventory) : null;

			this.inventory = null;
		}
	};

	getFood = (nearbyFood, nearbyPheromones = []) => {
		let best = new Vector();
		let dist = 99999;

		if (!nearbyFood.length) {
			return best;
		}

		for (const food of nearbyFood) {
			const d = this.position.dist(food.position);
			if (d < settings.perceptionRadius && !food.held) {
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

		if (dist < settings.perceptionRadius) {
			return this.seek(best);
		}

		return this.followPheromone(nearbyPheromones, 'food');
	};

	findHome = (pheromones) => {
		const homeDist = this.position.dist(this.colony.position);
		if (homeDist < settings.perceptionRadius) {
			if (homeDist < 10) {
				this.unload();
			}
			return this.seek(this.colony.position);
		}

		return this.followPheromone(pheromones, 'home');
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

	wander() {
		const randX = Math.random() * 2 - 1;
		const randY = Math.random() * 2 - 1;

		return new Vector(randX, randY)
			.normalize()
			.mult(this.maxSpeed)
			.sub(this.velocity)
			.limit(this.maxForce);
	}

	walk() {
		let steeringForce = new Vector();

		if (this.hasFood) {
			steeringForce = this.findHome(Ant.pheromoneSet).mult(settings.steerForce);
		} else {
			steeringForce = this.getFood(Ant.foodSet, Ant.pheromoneSet).mult(settings.steerForce);
		}

		// mandatory wander
		const wander = this.wander().mult(settings.wanderStrength);

		this.acceleration.add(steeringForce).add(wander);
	}

	show(ctx) {
		if (settings.showRadius) {
			ctx.strokeStyle = 'rgba(255,255,255, 0.5)';

			ctx.beginPath();
			ctx.arc(this.position.x, this.position.y, settings.perceptionRadius, 0, 2 * Math.PI);
			ctx.closePath();
			ctx.stroke();
		}

		ctx.fillStyle = this.color;
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
	}

	update(ctx) {
		this.theta = this.velocity.angle;

		this.walk();
		this.position.add(this.velocity);
		this.edges();
		this.velocity.add(this.acceleration).limit(this.maxSpeed);
		this.acceleration.mult(0);
		this.show(ctx);
	}
}
