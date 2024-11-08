// import GUI from 'lil-gui';
// import Ant from '$ents/ant.svelte';
// import Food from '$ents/food.svelte';
// import Colony from '$ents/colony.svelte';

// // import {}

// const canvas = document.getElementById('canvas');

// let gui;

// const settings = {
// 	clickBody: 'colony',
// 	foodClick: 4
// };

// const setup = () => {
// 	canvas.width = window.innerWidth;
// 	canvas.height = window.innerHeight;

// 	Food.debugger(gui);
// 	Colony.debugger(gui);

// 	const foodBits = 20;

// 	generateFood(foodBits);

// 	canvas.addEventListener('click', (e) => {
// 		switch (settings.clickBody) {
// 			case 'colony':
// 				colonyArray.add(new Colony(e.x, e.y, 20));
// 				break;
// 			case 'food':
// 				generateFood(settings.foodClick, { x: e.x, y: e.y });
// 				break;
// 			default:
// 				console.log('inexistent tool');
// 				break;
// 		}
// 	});

// 	window.requestAnimationFrame(animate);
// };

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

// /* ---------------------------
//    ----- EVENT LISTENERS -----
//    --------------------------- */

// window.onload = () => {
// 	gui = new GUI();

// 	const brush = gui.addFolder('Brush');
// 	brush
// 		.add(settings, 'clickBody', {
// 			'Add Colony': 'colony',
// 			'Add Food': 'food'
// 		})
// 		.name('Click Function');
// 	brush.add(settings, 'foodClick', 1, 20, 1).name('Food Bits');

// 	canvas.addEventListener('contextmenu', (e) => {
// 		console.log('right click');
// 	});

// 	setup();
// };

// // change canvas size as browser window resizes
// window.addEventListener('resize', () => {
// 	setup();
// });
