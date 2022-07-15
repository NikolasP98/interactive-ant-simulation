import GUI from 'lil-gui';
import { Colony, Food, getRandom } from './classes';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let gui;

const foodArray = [];
const colonyArray = [];

const setup = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	Food.debugger(gui);
	Colony.debugger(gui);

	const foodBits = 20;

	for (let i = 0; i < foodBits; i++) {
		foodArray.push(
			new Food(getRandom(0, canvas.width), getRandom(0, canvas.height))
		);
	}

	window.requestAnimationFrame(animate);
};

const animate = () => {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	// MAIN ANIMATION CODE START

	for (let food of foodArray) {
		food.update(ctx);
	}

	for (let colony of colonyArray) {
		colony.update(ctx);
	}

	// MAIN ANIMATION CODE END
	window.requestAnimationFrame(animate);
};

/* ---------------------------
   ----- EVENT LISTENERS -----
   --------------------------- */

window.onload = () => {
	gui = new GUI();

	canvas.addEventListener('click', (e) => {
		console.log(typeof foodArray);
		colonyArray.push(new Colony(e.x, e.y, 20, foodArray));
	});

	canvas.addEventListener('contextmenu', (e) => {
		console.log('right click');
	});

	setup();
};

// change canvas size as browser window resizes
window.addEventListener('resize', () => {
	setup();
});
