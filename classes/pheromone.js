import Vector from './vector';
import Ant from './ant';

const settings = {
	lifeTime: 1000,
	size: 1.3,
};

export default class Pheromone {
	static debug = false;
	constructor(x, y, color, type = 'home') {
		this.position = new Vector(x, y);
		this.color = color || 'white';
		this.radius = settings.size;
		this.lifeTime = settings.lifeTime;
		this.type = type;
	}

	static debugger(gui) {
		if (!Pheromone.debug) {
			Pheromone.debug = true;
			const pheromoneFolder = gui.addFolder('Pheromone');
			pheromoneFolder.add(settings, 'lifeTime', 0, 1000, 10);
			pheromoneFolder.add(settings, 'size', 0, 3, 0.1);
		}
	}

	show(ctx) {
		ctx.fillStyle = this.color;
		if (this.type == 'food') {
			const alpha = this.lifeTime / settings.lifeTime;
			ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
		}

		ctx.fillRect(
			this.position.x - this.radius,
			this.position.y - this.radius,
			this.radius * 2,
			this.radius * 2
		);
	}

	update(ctx) {
		if (this.lifeTime <= 0) {
			Ant.pheromoneSet.delete(this);
		}

		this.lifeTime--;
		this.show(ctx);
	}
}
