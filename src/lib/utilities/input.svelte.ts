export default class InputHandler {
	constructor() {
		this.lastKey = '';
		this.mouse = {
			x: null,
			y: null,
		};
		this.mouseMove = {
			x: null,
			y: null,
		};

		window.addEventListener('keydown', (e) => {
			this.lastAction = e.key;
		});

		window.addEventListener('click', (e) => {
			this.lastKey = 'click';
			this.mouse.x = e.x;
			this.mouse.y = e.y;
		});

		window.addEventListener('mousemove', (e) => {
			this.mouseMove.x = e.x;
			this.mouseMove.y = e.y;
		});
	}
}
