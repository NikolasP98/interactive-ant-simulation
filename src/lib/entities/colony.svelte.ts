import Ant from '$lib/entities/ant.svelte';
import Vector from '$utils/vector.svelte';

const settings = {
	maxPopulation: 1
};
export default class Colony {
	static debug = false;

	static debugger(gui) {
		if (!Colony.debug) {
			Colony.debug = true;

			const colonyFolder = gui.addFolder('Colony');
			colonyFolder.add(settings, 'maxPopulation', 0, 40, 1);

			Ant.debugger(gui);
		}
	}

	private ants: Ant[] = $state([]);
	private antCount: number = $derived(() => this.ants.length);
	private foodCount: number = $state(0);
	private maxPopulation: number = $state(settings.maxPopulation);
	private color: string = $state('white');
	private position: Vector = $state<Vector>(new Vector());

	/**
	 * Constructor for a new colony.
	 * @param {number} [x=0] - The x position of the colony.
	 * @param {number} [y=0] - The y position of the colony.
	 */
	constructor(x?: number | undefined, y?: number | undefined) {
		this.position = new Vector(x || 0, y || 0);
		this.size = 20;

		this.color = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
		this.createAnt();
	}

	/**
	 * Creates a new ant every ms milliseconds.
	 * @param {number} [ms=200] - The time in milliseconds between each ant is created.
	 * @returns {Promise<void>}
	 */
	createAnt = async (ms = 200): Promise<void> => {
		while (this.ants.length < this.maxPopulation) {
			await new Promise((resolve) => setTimeout(resolve, ms));
			this.ants.push(new Ant(this.position.x, this.position.y, { colony: this }));
		}
	};

	show(ctx) {
		ctx.fillStyle = 'white';
		ctx.fillText(this.foodCount, this.position.x + this.size, this.position.y);
		ctx.fillStyle = this.color;
		ctx.fillRect(
			this.position.x - this.size / 2,
			this.position.y - this.size / 2,
			this.size,
			this.size
		);
	}

	update(ctx) {
		this.show(ctx);
		for (let ant of this.ants) {
			ant.update(ctx);
		}
	}
}
