import { getRandom } from '$utils/util.svelte';
import Vector2D from '$lib/utilities/vector.svelte';
import Ant from '$lib/entities/ant.svelte';
import Colony from '$lib/entities/colony.svelte';
import Food from '$lib/entities/food.svelte';
import setupGUI from '$utils/gui.svelte';

class WorldStore {
	private lastUpdate: number = $state(0);
	private cursorAction: string | null = $state('COLONY');
	private boundaries: { x: number; y: number; width: number; height: number } = $state({});

	private food: Food[] = $state([]);
	private colonies: Colony[] = $state([]);
	private canvas: HTMLCanvasElement | null = $state(null);

	private context: CanvasRenderingContext2D | null = $derived.by(() => {
		if (!this.canvas) return;

		return this.canvas.getContext('2d');
	});

	private ready: boolean = $state(false);

	private settings = {
		foodClick: 4
	};

	get ctx() {
		return this.context;
	}

	get cols() {
		return this.colonies;
	}

	constructor() {}

	setup = (canvas: HTMLCanvasElement, dims?: { x: number; y: number }) => {
		if (!canvas || !!this.canvas) return;

		this.canvas = canvas;

		console.log(dims.x);

		this.canvas.width = dims.x || 0;
		this.canvas.height = dims.y || 0;

		this.generateFood(20);

		canvas.addEventListener('pointerdown', (e) => {
			const x = e.clientX;
			const y = e.clientY;

			switch (this.cursorAction) {
				case 'COLONY':
					this.colonies.push(new Colony(x, y));
					break;
				case 'SCAVENGE':
					this.generateFood(this.settings.foodClick, { x, y });
					break;
				default:
					console.log('inexistent tool');
					break;
			}
		});
		// window.addEventListener('resize', () => {
		// 	this.canvas.width = window.innerWidth;
		// 	this.canvas.height = window.innerHeight;
		// });

		this.ready = true;
		this.run();

		setupGUI();
	};

	run = () => {
		if (!this.context || !this.canvas || !this.ready) return;

		const now = performance.now();
		const delta = now - this.lastUpdate;
		if (delta < 1000 / 60) {
			return requestAnimationFrame(this.run);
		}

		this.lastUpdate = now;

		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

		window.requestAnimationFrame(this.run);

		// MAIN ANIMATION CODE START

		// for (let ph of Ant.pheromoneSet) {
		// 	ph.update(this.context);
		// }

		for (let food of this.food) {
			food.update(this.context);
		}

		for (let colony of this.colonies) {
			colony.update(this.context);
		}

		// MAIN ANIMATION CODE END
	};

	generateFood = (foodBits: number, position: { x: number; y: number }) => {
		const range = 100;

		if (!position) {
			position = {
				x: getRandom(0, this.canvas?.width),
				y: getRandom(0, this.canvas?.height)
			};
		}
		for (let i = 0; i < foodBits; i++) {
			const coords = {
				x: getRandom(position.x - range, position.x + range) || getRandom(0, this.canvas?.width),
				y: getRandom(position.y - range, position.y + range) || getRandom(0, this.canvas?.height)
			};
			this.food.push(new Food(coords.x, coords.y));
		}
	};

	destroy() {
		this.canvas = null;
	}
}

export const world = new WorldStore();
