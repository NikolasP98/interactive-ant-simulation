// src/lib/entities/item.svelte.ts
import Vector from '$utils/vector.svelte';

export default class Item {
	private held: boolean = $state(false);
	public position: Vector = $state(new Vector());

	constructor(x: number, y: number) {
		this.position = new Vector(Math.floor(x), Math.floor(y));
	}
}
