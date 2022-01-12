import Main from './main.js';

let animation;
let mainEvent;

window.onload = () => {
	const canvas = document.getElementById('canvas');
	const ctx = canvas.getContext('2d');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	const initialData = {
		ctx,
		width: canvas.width,
		height: canvas.height,
		animation,
	};

	// change canvas size as browser window resizes
	window.addEventListener('resize', () => {
		cancelAnimationFrame(animation);
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		mainEvent = new Main(initialData);
		mainEvent.init();
	});

	// initiate simulation
	mainEvent = new Main(initialData);
	mainEvent.init();
};
