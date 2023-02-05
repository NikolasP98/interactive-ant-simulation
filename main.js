import GUI from 'lil-gui';
import { Application, Sprite, Assets } from 'pixijs';
import { Colony, Ant, Food, getRandom } from './classes';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let gui;

const app = new Application();
document.body.appendChild(app.view);

console.log(app);

const settings = {
	clickBody: 'colony',
	foodClick: 4,
};

const colonyArray = new Set();

const generateFood = (foodBits, position = false) => {
	const range = 20;
	for (let i = 0; i < foodBits; i++) {
		const coords = {
			x:
				getRandom(position.x - range, position.x + range) ||
				getRandom(0, canvas.width),
			y:
				getRandom(position.y - range, position.y + range) ||
				getRandom(0, canvas.height),
		};
		Ant.foodSet.add(new Food(coords.x, coords.y));
	}
};

const setup = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	Food.debugger(gui);
	Colony.debugger(gui);

	const foodBits = 20;

	generateFood(foodBits);

	canvas.addEventListener('click', (e) => {
		switch (settings.clickBody) {
			case 'colony':
				colonyArray.add(new Colony(e.x, e.y, 20));
				break;
			case 'food':
				generateFood(settings.foodClick, { x: e.x, y: e.y });
				break;
			default:
				console.log('inexistent tool');
				break;
		}
	});

	// animate()
	// window.requestAnimationFrame(animate);
};

const animate = () => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// MAIN ANIMATION CODE START

	for (let ph of Ant.pheromoneSet) {
		ph.update(ctx);
	}

	for (let food of Ant.foodSet) {
		food.update(ctx);
	}

	for (let colony of colonyArray) {
		colony.update(ctx);
	}

	// MAIN ANIMATION CODE END
};

// const animate = () => {
// 	ctx.clearRect(0, 0, canvas.width, canvas.height);
// 	// MAIN ANIMATION CODE START

// 	for (let ph of Ant.pheromoneSet) {
// 		ph.update(ctx);
// 	}

// 	for (let food of Ant.foodSet) {
// 		food.update(ctx);
// 	}

// 	for (let colony of colonyArray) {
// 		colony.update(ctx);
// 	}

// 	// MAIN ANIMATION CODE END
// 	window.requestAnimationFrame(animate);
// };

/* ---------------------------
   ----- EVENT LISTENERS -----
   --------------------------- */

window.onload = () => {
	gui = new GUI();

	const brush = gui.addFolder('Brush');
	brush
		.add(settings, 'clickBody', {
			'Add Colony': 'colony',
			'Add Food': 'food',
		})
		.name('Click Function');
	brush.add(settings, 'foodClick', 1, 20, 1).name('Food Bits');

	canvas.addEventListener('contextmenu', (e) => {
		console.log('right click');
	});

	setup();
};

// change canvas size as browser window resizes
window.addEventListener('resize', () => {
	setup();
});

app.ticker.add(animate);
