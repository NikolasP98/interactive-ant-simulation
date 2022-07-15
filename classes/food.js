import Vector from './vector.js';

const settings = {
	foodSize: 5,
};

export default class Food {
	static debug = false;

	constructor(x, y) {
		this.position = new Vector(Math.floor(x), Math.floor(y));
	}

	static debugger(gui) {
		if (!this.debug) {
			this.debug = true;

			const foodFolder = gui.addFolder('Food');
			foodFolder.add(settings, 'foodSize', 0, 20, 1);
		}
	}

	#draw(ctx) {
		ctx.fillStyle = 'green';
		ctx.fillRect(
			this.position.x - settings.foodSize / 2,
			this.position.y - settings.foodSize / 2,
			settings.foodSize,
			settings.foodSize
		);
	}

	update(ctx) {
		this.#draw(ctx);
	}
}
