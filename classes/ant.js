import Vector from './vector.js';
import { ellipse } from './shapes.js';
import { getRandom } from './util.js';

import { v4 } from 'uuid';

export default class Ant {
	#ctx;
	#WANDER_CHANCE;
	#foodMap;

	constructor({
		x = 0,
		y = 0,

		radius = 2,

		colony = null,

		color = 'white',
		showRadius = true,

		ctx,
	}) {
		this.position = new Vector(x, y);
		this.velocity = new Vector(0, 0);
		this.acceleration = new Vector(0, 0);

		this.lastPosition = new Vector(x, y);
		this.homeCoordinates = new Vector(x, y);

		this.hasFood = false;

		this.colony = colony;

		this.maxSpeed = 1;
		this.maxForce = 4;

		this.radius = radius;
		this.color = color;

		this.showRadius = showRadius;
		this.instinct = this.radius * 5;

		this.pheromones = [];
		this.strength = 1;

		this.id = v4();

		this.#ctx = ctx;
		this.#foodMap = this.colony.foodMap;
		this.#WANDER_CHANCE = 0.92;
	}

	#layPheromone() {
		if (
			this.position.x != this.lastPosition.x ||
			this.position.y != this.lastPosition.y
		) {
			// this.pheromones.push(
			// 	new Ant({
			// 		x: this.position.x,
			// 		y: this.position.y,
			// 		radius: this.radius / 3,
			// 		color: 'green',
			// 	})
			// );

			console.log('pheromone');
		}
	}

	#detectCollision(other) {
		if (
			this.position.x > other.position.x &&
			this.position.x < other.position.x + other.width &&
			this.position.y > other.position.y &&
			this.position.y < other.position.y + other.height
		) {
			// console.log('touched');
			return true;
		}
		return false;
	}

	#dropOff() {
		if (this.#detectCollision(this.colony)) {
			// console.log('dropped off');
			this.color = 'white';
			this.hasFood = false;
		}
	}

	#eat() {
		// if ant lands on food, delete food from array
		for (let food of this.#foodMap) {
			if (this.#detectCollision(food)) {
				this.#foodMap.splice(this.#foodMap.indexOf(food), 1);
				this.color = 'green';
				this.hasFood = true;
			}
		}
	}

	#edges() {
		if (this.position.x > canvas.width) {
			// console.log('invaded right');
			this.position.x = 0;
		} else if (this.position.x < 0) {
			// console.log('invaded left');
			this.position.x = canvas.width;
		}
		if (this.position.y > canvas.height) {
			// console.log('invaded down');
			this.position.y = 0;
		} else if (this.position.y < 0) {
			// console.log('invaded up');
			this.position.y = canvas.height;
		}
	}

	#draw() {
		this.#ctx.fillStyle = this.color;
		this.#ctx.strokeStyle = 'transparent';

		ellipse({
			x: this.position.x,
			y: this.position.y,
			radius: this.radius,
			ctx: this.#ctx,
		});

		for (let pheromone of this.pheromones) {
			pheromone.show();
		}
		if (this.ring) {
			this.#ctx.fillStyle = 'transparent';
			this.#ctx.strokeStyle = 'white';
			ellipse({
				x: this.position.x,
				y: this.position.y,
				radius: this.instinct,
				ctx: this.#ctx,
			});
		}
	}

	#step() {
		const rand = Math.random();
		if (rand > this.#WANDER_CHANCE) {
			this.velocity = new Vector(
				getRandom(-1 * this.maxSpeed, this.maxSpeed),
				getRandom(-1 * this.maxSpeed, this.maxSpeed)
			);
		}
		if (this.hasFood) {
			// sniff home
			this.velocity = this.velocity.add(
				this.homeCoordinates.sub(this.position).normalize().mult(0.1)
			);
		} else {
			// sniff food
		}
		this.#layPheromone();
		this.position = this.position.add(this.velocity);
	}

	update() {
		this.#step();
		this.#edges();
		if (this.hasFood) {
			this.#dropOff();
		} else {
			this.#eat();
		}
		this.#draw();
	}
}
