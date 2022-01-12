import Ant from './ant.js';
import Vector from './vector.js';
import { rect, ellipse } from './shapes.js';

export default class Colony {
	#maxPopulation;
	#ants;
	#ctx;

	constructor({ x, y, maxPop = 5, foodMap, ctx }) {
		this.position = new Vector(x, y);
		this.width = 20;
		this.height = 20;
		this.#maxPopulation = maxPop;
		this.#ants = [];

		this.foodMap = foodMap;

		this.#createAnt(200);

		this.#ctx = ctx;
	}

	async #createAnt(ms) {
		await setTimeout(() => {
			if (this.#ants.length < this.#maxPopulation) {
				this.#ants.push(
					new Ant({
						x: this.position.x,
						y: this.position.y,
						colony: this,
						ctx: this.#ctx,
					})
				);
				this.#createAnt(ms);
			}
		}, ms);
	}

	#draw() {
		this.#ctx.fillStyle = 'orange';
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
		for (let ant of this.#ants) {
			ant.update();
		}
		this.#draw();
	}
}
