import GUI from 'lil-gui';

const settings = {
	brush = {
		clickAction: 'colony',
		foodClickAmount: 4
	}
};

export default function setupGUI() {
	const gui = new GUI();

	const brushFolder = gui.addFolder('Brush');
	brushFolder
		.add(settings.brush, 'clickAction', {
			'Add Colony': 'colony',
			'Add Food': 'food'
		})
		.name('Click Function');

	brushFolder.add(settings.brush, 'foodClickAmount', 1, 20, 1).name('Food Bits');
}
