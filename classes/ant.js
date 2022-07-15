import Vector from './vector.js';

const settings = {
	wanderStrength: 0.1,
	steerForce: 0.1,

	perceptionRadius: 100,
	showRadius: true,
};
export default class Ant {
	static debug = false;

	#foodMap;

	constructor(
		x = 0,
		y = 0,
		colony = null,
		radius = 5,

		color = 'white',
		showRadius = true
	) {
		this.position = new Vector(x, y);
		this.velocity = new Vector(0, 0);
		this.acceleration = new Vector(0, 0);
		this.theta = 0;

		this.hasFood = false;

		this.colony = colony;

		this.maxSpeed = 1;
		this.maxForce = 0.01;

		this.radius = radius;
		this.color = color;

		this.showRadius = showRadius;
		this.perceptionRadius = 100;

		this.strength = 1;

		this.#foodMap = this.colony.foodMap;
	}

	static debugger(gui) {
		if (!this.debug) {
			this.debug = true;
			const antFolder = gui.addFolder('Ant');

			antFolder.add(settings, 'wanderStrength', 0, 1);
			antFolder.add(settings, 'steerForce', 0, 1);
			antFolder.add(settings, 'perceptionRadius', 0, 1000);
			antFolder.add(settings, 'showRadius', true);
		}
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

	#draw(ctx) {
		if (settings.showRadius) {
			ctx.strokeStyle = 'rgba(255,255,255, 0.5)';

			ctx.beginPath();
			ctx.arc(
				this.position.x,
				this.position.y,
				settings.perceptionRadius,
				0,
				2 * Math.PI
			);
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

	search(foodArray) {
		const randX = Math.random() * 2 - 1;
		const randY = Math.random() * 2 - 1;

		return new Vector(randX, randY).normalize().mult(this.maxSpeed);
	}

	wander() {
		const randX = Math.random() * 2 - 1;
		const randY = Math.random() * 2 - 1;

		return new Vector(randX, randY).normalize().mult(this.maxSpeed);
	}

	#walk() {
		let steeringForce = new Vector(0, 0);

		if (this.hasFood) {
			// if has food, drop off
		} else {
			steeringForce
				.add(this.search(this.colony.foodMap))
				.mult(settings.steerForce);
			// get food:
			// if food is found, go to food
			// if food is not found, search for food and pheromones
		}

		// mandatory wander
		const wander = this.wander().mult(settings.wanderStrength);

		this.acceleration.add(steeringForce).add(wander);
	}

	update(ctx) {
		this.theta = this.velocity.getAngle();

		this.#walk();
		this.position.add(this.velocity);
		this.#edges();
		this.velocity.add(this.acceleration).limit(this.maxSpeed);
		this.acceleration.mult(0);
		this.#draw(ctx);
	}
}
