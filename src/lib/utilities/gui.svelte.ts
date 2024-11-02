import GUI from 'lil-gui';

const settings = {
	brush: {
		clickAction: 'COLONY',
		foodClickAmount: 4
	}
};

export default class appGUI extends GUI {
	constructor(settings = {}) {
		super();
	}

	/**
	 * Destroys the GUI and removes all event listeners.
	 * @description This function should be called when the app is closed, to prevent memory leaks.
	 */
	destroy() {
		this.destroy();
	}
}
