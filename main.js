import { Colony, Food, InputHandler, getRandom } from './classes';
import { rect } from './classes/shapes';
export default class Main {
	#ctx;
	#width;
	#height;
	#input;
	#colonyArray;
	#foodArray;

	constructor({ ctx, width, height, animation }) {
		this.#ctx = ctx;
		this.#width = width;
		this.#height = height;
		this.#foodArray = [];
		this.#colonyArray = [];

		this.animation = animation;
		this.#input = new InputHandler();

		window.addEventListener('click', (e) => {
			this.#colonyArray.push(
				new Colony({
					x: e.x,
					y: e.y,
					maxPop: 20,
					ctx,
					foodMap: this.#foodArray,
				})
			);
			// console.log(this.#colonyArray);
		});

		window.addEventListener('contextmenu', (e) => {
			console.log('right click');
		});

		this.foodBits = 2;
	}

	// setup function runs once before animation begins
	init = () => {
		for (let i = 0; i < this.foodBits; i++) {
			this.#foodArray.push(
				new Food({
					x: getRandom(0, this.#width),
					y: getRandom(0, this.#height),
					w: 50,
					h: 50,
					ctx: this.#ctx,
				})
			);
		}
		// console.log(this.#foodArray);
		window.requestAnimationFrame(this.#animate);
	};

	// animation loop runs indefinitely
	#animate = () => {
		this.#ctx.clearRect(0, 0, canvas.width, canvas.height);
		// MAIN ANIMATION CODE START

		for (let food of this.#foodArray) {
			food.update();
		}

		for (let colony of this.#colonyArray) {
			colony.update();
		}

		this.#ctx.fillStyle = this.color;
		this.#ctx.strokeStyle = 'transparent';

		rect({
			x: 50,
			y: 50,
			w: 20,
			h: 50,
			ctx: this.#ctx,
		});

		// MAIN ANIMATION CODE END
		this.animation = window.requestAnimationFrame(this.#animate.bind(this));
	};
}
