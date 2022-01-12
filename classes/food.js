import Vector from './vector.js';
import { rect } from './shapes.js';

export default class Food {
	#ctx;

	constructor({ x, y, w = 10, h = 10, ctx }) {
		this.position = new Vector(Math.floor(x), Math.floor(y));
		this.width = w;
		this.height = h;
		this.#ctx = ctx;
	}

	#draw() {
		this.#ctx.fillStyle = 'green';
		this.#ctx.strokeStyle = 'transparent';
		rect({
			x: this.position.x,
			y: this.position.y,
			w: this.width,
			h: this.height,
			ctx: this.#ctx,
		});
	}

	update() {
		this.#draw();
	}
}
