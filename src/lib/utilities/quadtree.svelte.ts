// debug settings
const settings = {
	debug: true,
	maxDepth: 4,
	maxCapacity: 4,
	stats: false,
	queryShape: 'square'
};

export default class QuadTree {
	static debug = false;
	private root: Quad = $state({});

	constructor(bounds) {
		this.root = new Quad(bounds);
	}

	// get() {
	// 	return this.root;
	// }

	set edges(bounds: { x: number; y: number; width: number; height: number }) {
		this.root.bounds = { ...this.root.bounds, ...bounds };
	}

	static debugger(gui, points) {
		if (!this.debug) {
			this.debug = true;
			gui.add(settings, 'debug').name('Show QuadTree');
			// 	gui.add(settings, 'maxDepth', 1, 8, 1)
			// 		.name('Max Depth')
			// 		.onFinishChange((e) => {
			// 			qt.clear();
			// 			qt.root.maxDepth = e;
			// 			qt.insert(points);
			// 			qt.
			// 		});
			// 	gui.add(settings, 'maxCapacity', 1, 10, 1)
			// 		.name('Max Capacity')
			// 		.onFinishChange((e) => {
			// 			qt.clear();
			// 			qt.root.maxCapacity = e;
			// 			qt.insert(points);
			// 		});
			// }
		}
	}

	public insert = (item): void => {
		if (item instanceof Array) {
			for (let i = 0; i < item.length; i++) {
				this.root.insert(item[i]);
			}
		} else {
			this.root.insert(item);
		}
	};

	public query = (bounds, shape = 'square') => {
		return this.root.query(bounds, shape);
	};

	public clear = (): void => {
		this.root.clear();
	};

	public draw = (ctx): void => {
		if (settings.debug) {
			this.root.draw(ctx);
		}
	};
}

class Quad {
	private children: any[] = $state([]);
	private nodes = $state([] as Quad[]);

	public bounds: { x: number; y: number; width: number; height: number } = $state({});

	private maxCapacity: number;
	private maxDepth: number;
	private depth: number;

	private TL = 0;
	private TR = 1;
	private BL = 2;
	private BR = 3;

	private drawQuery = true;
	private queryBounds = {};

	/**
	 * Create a new node with the given bounds.
	 * @param {Bounds} bounds - bounds of the canvas
	 * @param {number} [depth=0] - current depth of the node
	 * @param {number} [maxDepth=4] - up to how many levels to split the quadtree
	 * @param {number} [maxCapacity=4] - max capacity per container before splitting
	 */
	constructor(bounds, depth?, maxDepth? = settings.maxDepth, maxCapacity? = settings.maxCapacity) {
		// bounds of the canvas
		this.bounds = { ...this.bounds, ...bounds };

		// max capacity per container befor splitting
		this.maxCapacity = maxCapacity;

		// Up to how many levels to split the quadtree
		this.maxDepth = maxDepth;

		// Current depth of the node
		this.depth = depth;

		// Array of children bodies on canvas
		// Array of children of node objects caused by this.split()
	}

	public query = (coordinates, shape = 'square'): any[] => {
		this.queryBounds = coordinates;

		// Will return an array regardless of level of quadtree
		let bodies = this.children;
		const indexes = this.getIndexes(coordinates);

		// If there are child nodes, query them as well (will get plenty duplicate bodies)
		if (this.nodes.length) {
			for (const index of indexes) {
				bodies = bodies.concat(this.nodes[index].query(coordinates));
			}
		}

		// filter out duplicates
		bodies = bodies.filter((item, index) => {
			return bodies.indexOf(item) >= index;
		});

		return bodies;
	};

	public insert = (item: any): void => {
		let indexes = this.getIndexes(item);
		if (this.nodes.length) {
			for (const index of indexes) {
				this.nodes[index].insert(item);
			}
			return;
		}

		// Once deepest node is reached (or if none exist), add item to current node
		// Add item to root node
		this.children.push(item);

		// Execute if after adding item, the exceeds maxChildren and is within depth limit
		if (this.depth < this.maxDepth && this.children.length > this.maxCapacity) {
			// Split node
			this.split();

			// redistribute children to nodes
			for (let i = 0; i < this.children.length; i++) {
				this.insert(this.children[i]);
			}

			// Clear children of current node after children nodes are populated so we don't have duplicates in tree (only child nodes contain bodies)
			this.children = [];
		}
	};

	private getNodeCoords = (
		x: number,
		y: number,
		width?: number = 0,
		height?: number = 0
	): { x: number; y: number }[] => {
		const h = height || width;

		const corners = [{ x, y }];

		if (width && h) {
			corners.push(
				{ x: x + width, y },
				{ x, y: y + h },
				{
					x: x + width,
					y: y + h
				}
			);
		}

		return corners;
	};

	private getIndexes = (coords) => {
		const indexes = [];
		const corners = this.getNodeCoords(coords.x, coords.y, coords.width, coords.height);

		for (let i = 0; i < corners.length; i++) {
			indexes.push(this.getQuadrant(corners[i]));
		}

		return new Set(indexes);
	};

	private getQuadrant = (item) => {
		const bounds = this.bounds;

		const horizontalMidpoint = bounds.y + bounds.height / 2;
		const verticalMidpoint = bounds.x + bounds.width / 2;

		const TB = item.y > horizontalMidpoint ? 'B' : 'T';
		const LR = item.x > verticalMidpoint ? 'R' : 'L';

		let index = this[`${TB}${LR}`];

		return index;
	};

	private split = (): void => {
		const depth = this.depth + 1;

		// Origin of current Node (original node has 0,0)
		let originX = this.bounds.x;
		let originY = this.bounds.y;

		// Split current node halfway horizontally and vertically
		let halfWidth = Math.floor(this.bounds.width / 2);
		let halfHeight = Math.floor(this.bounds.height / 2);

		// Place on canvas (origin + halfLengths)
		const halfWidthCoord = originX + halfWidth;
		const halfHeightCoord = originY + halfHeight;

		// ? Why so many location variables?
		// Rectangles take an x, y coordinate and a width and height
		// Coordinate variables are for x and y values
		// halfLengths are for width and height values (distance from each origin)

		this.nodes[this.TL] = new Quad(
			{ x: originX, y: originY, width: halfWidth, height: halfHeight },
			depth
		);
		this.nodes[this.TR] = new Quad(
			{
				x: halfWidthCoord,
				y: originY,
				width: halfWidth,
				height: halfHeight
			},
			depth
		);
		this.nodes[this.BL] = new Quad(
			{
				x: originX,
				y: halfHeightCoord,
				width: halfWidth,
				height: halfHeight
			},
			depth
		);
		this.nodes[this.BR] = new Quad(
			{
				x: halfWidthCoord,
				y: halfHeightCoord,
				width: halfWidth,
				height: halfHeight
			},
			depth
		);
	};

	public draw = (ctx: CanvasRendreringContext2D) => {
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#ff00ff';

		ctx.strokeRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

		if (this.drawQuery) {
			ctx.strokeStyle = '#00ff00';
			ctx.strokeRect(
				this.queryBounds.x,
				this.queryBounds.y,
				this.queryBounds.width,
				this.queryBounds.height
			);
		}

		if (this.nodes.length > 0) {
			for (let i = 0; i < this.nodes.length; i++) {
				this.nodes[i].draw(ctx);
			}
		}

		ctx.stroke();
	};

	clear() {
		this.children = [];
		for (let i = 0; i < this.nodes.length; i++) {
			this.nodes[i].clear();
		}
	}
}
