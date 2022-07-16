import Ant from './ant.js';
import Vector from './vector.js';

const settings = {
	maxPopulation: 1,
};
export default class Colony {
	static debug = false;

	#ants;

	constructor(x, y) {
		this.position = new Vector(x, y);
		this.size = 20;
		this.maxPopulation = settings.maxPopulation;
		this.#ants = [];
		this.foodCount = 0;

		this.color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

		this.#createAnt();
	}

	static debugger(gui) {
		if (!Colony.debug) {
			Colony.debug = true;

			const colonyFolder = gui.addFolder('Colony');
			colonyFolder.add(settings, 'maxPopulation', 0, 20, 1);

			Ant.debugger(gui);
		}
	}

	async #createAnt(ms = 200) {
		await setTimeout(() => {
			if (this.#ants.length < this.maxPopulation) {
				this.#ants.push(
					new Ant(this.position.x, this.position.y, this)
				);
				this.#createAnt(ms);
			}
		}, ms);
	}

	#draw(ctx) {
		ctx.fillStyle = this.color;
		ctx.fillRect(
			this.position.x - this.size / 2,
			this.position.y - this.size / 2,
			this.size,
			this.size
		);
		ctx.fillText(this.foodCount, this.position.x, this.position.y);
	}

	update(ctx) {
		for (let ant of this.#ants) {
			ant.update(ctx);
		}
		this.#draw(ctx);
	}
}
