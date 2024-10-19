// src/lib/utilities/quadTree.svelte.ts
import { Vector } from '$utils/vector.svelte';

class QuadTree {
	private points: any[] = $state([]);
	private nodes: QuadTree[] = $state([]);

	private capacity: number = $state(4);
	private bounds: { x: number; y: number; width: number; height: number } = $state({});

	constructor(capacity: number, bounds: { x: number; y: number; width: number; height: number }) {
		this.capacity = capacity;
		this.bounds = bounds;
	}

	insert(point: any) {
		if (!this.bounds.contains(point.position)) {
			return false;
		}

		if (this.points.length < this.capacity) {
			this.points.push(point);
			return true;
		}

		if (!this.nodes.length) {
			this.subdivide();
		}

		for (const node of this.nodes) {
			if (node.insert(point)) {
				return true;
			}
		}

		return false;
	}

	query(range: { x: number; y: number; width: number; height: number }) {
		const pointsInRange: any[] = [];

		if (!this.bounds.intersects(range)) {
			return pointsInRange;
		}

		for (const point of this.points) {
			if (range.contains(point.position)) {
				pointsInRange.push(point);
			}
		}

		if (this.nodes.length) {
			for (const node of this.nodes) {
				pointsInRange.push(...node.query(range));
			}
		}

		return pointsInRange;
	}

	private subdivide() {
		const x = this.bounds.x;
		const y = this.bounds.y;
		const width = this.bounds.width / 2;
		const height = this.bounds.height / 2;

		this.nodes.push(
			new QuadTree(this.capacity, { x, y, width, height }),
			new QuadTree(this.capacity, { x: x + width, y, width, height }),
			new QuadTree(this.capacity, { x, y: y + height, width, height }),
			new QuadTree(this.capacity, { x: x + width, y: y + height, width, height })
		);
	}
}

export default QuadTree;
