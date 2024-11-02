import Vector from '$utils/vector.svelte';
import Item from './item.svelte';
import { world } from '$stores/worldStore.svelte';
import dbg from '$stores/GUISettings.svelte';

export default class Food extends Item {
	private held: boolean = $state(false);
	private color: string = $state('green');

	/**
	 * Creates a new food item at the given position.
	 * @param {number} options.x - The x-coordinate of the food item.
	 * @param {number} options.y - The y-coordinate of the food item.
	 */
	constructor({ x, y }) {
		super(x, y);
		// this.foodSize = foodSize || settings.foodSize;
	}

	private show = () => {
		const ctx = world.ctx;

		if (!ctx) return;

		const foodSize = dbg.foodSettings.foodSize;

		ctx.fillStyle = this.color;
		ctx.fillRect(
			this.position.x - foodSize / 2,
			this.position.y - foodSize / 2,
			foodSize,
			foodSize
		);

		// console.log(dbg.foodSettings.foodSize);
	};

	update = () => {
		this.show();
	};
}
