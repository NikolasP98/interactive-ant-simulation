import { getRandom } from '$utils/util.svelte';
import Vector2D from '$utils/vector.svelte';
import Ant from '$ents/ant.svelte';
import Colony from '$ents/colony.svelte';
import Food from '$ents/food.svelte';
import QuadTree from '$utils/quadtree.svelte';
import World from '$ents/world.svelte';

export class WorldStore {
	private canvas: HTMLCanvasElement | null = $state(null);
	private context: CanvasRendreringContext2D | null = $derived.by(() => {
		// If the canvas is not set, return null
		if (!this.canvas) return null;
		return this.canvas.getContext('2d');
	});

	private cursorAction: string | null = $state('COLONY');
	private boundaries: { x: number; y: number; width: number; height: number } = $state({
		x: 0,
		y: 0
	});

	public entities: QuadTree = $state(new QuadTree(0, 0, 0, 0));

	public food: Food[] = $derived.by(() => {
		const food = this.entities.query(this.boundaries);
		return food;
	});

	private colonies: QuadTree = $state({});

	private settings = {
		foodClick: 4
	};

	private ready: boolean = $state(false);

	private lastUpdate: number = $state(0);
	/**
	 * Returns the current context of the canvas.
	 */
	public get ctx(): CanvasRendreringContext2D | null {
		return this.context;
	}

	/**
	 * Returns the list of colonies.
	 */
	public get cols(): QuadTree {
		return this.colonies;
	}

	constructor() {
		// this.cursorAction = 'COLONY';
	}

	/**
	 * Set up the world store with the given canvas element and dimensions.
	 * @param canvas - the canvas element
	 * @param dims - the dimensions of the canvas
	 */

	public setup = (canvas: HTMLCanvasElement, dims?: { x: number; y: number }) => {
		if (!canvas || !!this.canvas) return;

		this.canvas = canvas;

		this.canvas.width = dims.x || 0;
		this.canvas.height = dims.y || 0;

		this.entities.edges = { width: dims.x || 0, height: dims.y || 0 };
		$inspect(dims);
		$inspect(this.entities);

		// Generate food on the canvas
		this.generateFood(20);

		this.ready = true;

		// this.debug();
		this.run();

		// DEBUGGER

		// Add an event listener for when the user clicks on the canvas
		this.canvas.addEventListener('click', (ev) => {
			if (ev.target !== this.canvas) return;

			const rect = this.canvas.getBoundingClientRect();
			const x = ev.clientX - rect.left;
			const y = ev.clientY - rect.top;

			// Check if the user clicked on a food bit
			for (let food of this.food) {
				if (
					food.position.x > x - 5 &&
					food.position.x < x + 5 &&
					food.position.y > y - 5 &&
					food.position.y < y + 5
				) {
					// If the user clicked on a food bit, remove it and add a new food bit to the quadtree
					this.entities.remove(food);

					// Add a new food bit to the quadtree
					this.entities.insert(new Food({ x: food.position.x + 5, y: food.position.y + 5 }));
					return;
				}
			}

			// If the user didn't click on a food bit, add a new colony to the quadtree
			this.entities.insert(new Colony(x, y));
		});
	};

	/**
	 * Run the main animation loop.
	 */
	private run = (): void => {
		if (!this.context || !this.canvas || !this.ready) return;

		const now = performance.now();
		const delta = now - this.lastUpdate;
		if (delta < 1000 / 60) {
			return requestAnimationFrame(this.run);
		}

		this.lastUpdate = now;

		// Clear the canvas
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// MAIN ANIMATION CODE START

		// for (let ph of Ant.pheromoneSet) {
		// 	ph.update(this.context);
		// }

		// Iterate over all the food and update it
		for (let food of this.food) {
			food.update(this.context);
		}

		// // Iterate over all the colonies and update them
		// for (let colony of this.colonies) {
		// 	colony.update(this.context);
		// }

		// // MAIN ANIMATION CODE END
		window.requestAnimationFrame(this.run);
	};

	/**
	 * Generate a certain amount of food on the canvas at a given position.
	 * @param foodBits - the number of food bits to generate
	 * @param position - the position to generate the food at
	 */

	generateFood = (foodBits: number, position: { x: number; y: number }) => {
		const range = 100;

		// If no position is given, generate the food at a random position
		if (!position) {
			position = {
				x: getRandom(0, this.canvas?.width),
				y: getRandom(0, this.canvas?.height)
			};
		}

		// Generate the food
		for (let i = 0; i < foodBits; i++) {
			const coords = {
				x: getRandom(position.x - range, position.x + range) || getRandom(0, this.canvas?.width),
				y: getRandom(position.y - range, position.y + range) || getRandom(0, this.canvas?.height)
			};
			this.entities.insert(new Food(coords));
		}
	};

	/**
	 * Destroy the world store.
	 */
	destroy() {
		this.canvas = null;
	}
}

export const world = new WorldStore();
