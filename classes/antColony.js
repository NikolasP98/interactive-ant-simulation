import Ant from './ant.js';
import Vector from './vector.js';

const settings = {
	maxPopulation: 5,
};
export default class Colony {
	static debug = false;

	#ants;

	constructor(x, y, foodMap) {
		this.position = new Vector(x, y);
		this.size = 20;
		this.maxPopulation = settings.maxPopulation;
		this.#ants = [];

		this.foodMap = foodMap;
		console.log(typeof this.foodMap);
		console.log(typeof foodMap);

		this.#createAnt();
	}

	static debugger(gui) {
		if (!this.debug) {
			this.debug = true;

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
		ctx.fillStyle = 'orange';
		ctx.fillRect(
			this.position.x - this.size / 2,
			this.position.y - this.size / 2,
			this.size,
			this.size
		);
	}

	update(ctx) {
		for (let ant of this.#ants) {
			ant.update(ctx);
		}
		this.#draw(ctx);
	}
}
