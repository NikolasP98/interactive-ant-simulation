import Vector from './vector';
import Pheromone from './pheromone';

const settings = {
	wanderStrength: 2.5,
	steerForce: 1,

	perceptionRadius: 100,
	showRadius: true,
};
export default class Ant {
	static debug = false;
	static foodSet = new Set();
	static pheromoneSet = new Set();

	constructor(
		x = 0,
		y = 0,
		colony = null,
		radius = 5,

		showRadius = true
	) {
		this.position = new Vector(x, y);
		this.velocity = new Vector();
		this.acceleration = new Vector();
		this.theta = 0;

		this.hasFood = false;

		this.inventory = null;

		this.colony = colony;

		this.maxSpeed = 1;
		this.maxForce = 0.01;

		this.radius = radius;
		this.color = colony.color || 'white';

		this.showRadius = showRadius;
		this.perceptionRadius = 100;

		this.strength = 1;

		this.layPheromones();
	}

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

	layPheromones() {
		setInterval(() => {
			Ant.pheromoneSet.add(
				new Pheromone(
					this.position.x,
					this.position.y,
					this.colony.color,
					this.hasFood ? 'food' : 'home'
				)
			);
		}, 500);
	}

	followPheromone(pheromones, type) {
		const getPheromones = Array.from(pheromones).filter((ph) => {
			const d = this.position.dist(ph.position);
			return ph.type == type && d <= settings.perceptionRadius;
		});

		if (getPheromones.length) {
			const bestPheromone = getPheromones.reduce((a, b) => {
				return a.lifeTime < b.lifeTime ? a : b;
			});
			return this.seek(bestPheromone.position);
		}
		return new Vector();
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

	dropOff() {
		if (this.hasFood) {
			this.hasFood = false;
			this.color = this.colony.color || 'white';
			this.colony.foodCount++;

			Ant.foodSet.delete(this.inventory)
				? Ant.foodSet.has(this.inventory)
				: null;

			this.inventory = null;
		}
	}

	getFood(foodSet, pheromones = []) {
		let best = new Vector();
		let dist = 99999;

		if (!foodSet.size) {
			return best;
		}

		for (const food of foodSet) {
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

		return this.followPheromone(pheromones, 'food');
	}

	findHome(pheromones) {
		const homeDist = this.position.dist(this.colony.position);
		if (homeDist < settings.perceptionRadius) {
			if (homeDist < 10) {
				this.dropOff();
			}
			return this.seek(this.colony.position);
		}

		return this.followPheromone(pheromones, 'home');
	}

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
			steeringForce = this.findHome(Ant.pheromoneSet).mult(
				settings.steerForce
			);
		} else {
			steeringForce = this.getFood(Ant.foodSet, Ant.pheromoneSet).mult(
				settings.steerForce
			);
		}

		// mandatory wander
		const wander = this.wander().mult(settings.wanderStrength);

		this.acceleration.add(steeringForce).add(wander);
	}

	show(ctx) {
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

	update(ctx) {
		this.theta = this.velocity.getAngle();

		this.walk();
		this.position.add(this.velocity);
		this.edges();
		this.velocity.add(this.acceleration).limit(this.maxSpeed);
		this.acceleration.mult(0);
		this.show(ctx);
	}
}
