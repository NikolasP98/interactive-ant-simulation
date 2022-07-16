import Vector from './vector.js';

const settings = {
	foodSize: 5,
};

export default class Food {
	static debug = false;
	static foodSize = settings.foodSize;

	constructor(x, y) {
		this.position = new Vector(Math.floor(x), Math.floor(y));
		this.held = false;
	}

	static debugger(gui) {
		if (!this.debug) {
			this.debug = true;

			const foodFolder = gui.addFolder('Food');
			foodFolder.add(Food, 'foodSize', 0, 20, 1);
		}
	}

	show(ctx) {
		ctx.fillStyle = 'green';
		ctx.fillRect(
			this.position.x - Food.foodSize / 2,
			this.position.y - Food.foodSize / 2,
			Food.foodSize,
			Food.foodSize
		);
	}

	update(ctx) {
		this.show(ctx);
	}
}
