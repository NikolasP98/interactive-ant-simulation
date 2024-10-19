export default class Vector2D {
	// === STATIC METHODS ===

	static fromArray(array) {
		return new Vector2D(array[0], array[1]);
	}

	static fromObject(array) {
		return new Vector2D(array.x, array.y);
	}

	static random(scale = 1) {
		const r = Math.random() * 2.0 * Math.PI;
		return new Vector2D(Math.cos(r) * scale, Math.sin(r) * scale);
	}

	static add(a, b) {
		return new Vector2D(a.x + b.x, a.y + b.y);
	}

	static subtract(a, b) {
		return new Vector2D(a.x - b.x, a.y - b.y);
	}

	static multiply(a, scale) {
		return new Vector2D(a.x * scale, a.y * scale);
	}

	static divide(a, scale) {
		return new Vector2D(a.x / scale, a.y / scale);
	}

	static clone(a) {
		return new Vector2D(a.x, a.y);
	}

	static octant(angle) {
		return Math.round(((angle + Math.PI) / (Math.PI / 4)) % 8);
	}
	static quadrant(vector) {
		const epsilon = 0.1;

		if (Math.abs(vector.x) > Math.abs(vector.y)) {
			return vector.x < 0 ? 0 : 2;
		} else {
			return vector.y < 0 ? 3 : 1;
		}
	}

	private x: number = $state(null);
	private y: number = $state(null);

	constructor(newX?: number, newY?: number) {
		this.x = newX || 0;
		this.y = newY || 0;
	}

	// === GETTERS / SETTERS ===
	// toString(radix = 10) {
	// 	return `${x.toString(radix)},${y.toString(radix)}`;
	// }

	get coords() {
		return [this.x, this.y];
	}

	get magnitude() {
		return Math.hypot(this.x, this.y);
	}
	get angle() {
		return Math.atan2(this.y, this.x);
	}

	get sqrMag() {
		return this.x * this.x + this.y * this.y;
	}

	set coords(coords: number[] | Vector2D) {
		if (Array.isArray(coords)) {
			this.x = coords[0];
			this.y = coords[1];
		} else if (coords instanceof Vector2D) {
			this.x = coords.x;
			this.y = coords.y;
		} else {
			throw new Error('Invalid vector input');
		}
	}

	// === INSTANCE METHODS ===

	distance(v) {
		return Math.hypot(this.x - v.x, this.y - v.y);
	}

	dot(v) {
		return v.x * x + v.y * y;
	}

	// === UNARY METHODS (SETTERS W/ NO INPUT) ===

	zero() {
		x = 0;
		y = 0;
		return this;
	}

	normalize() {
		let l = sqrMag();
		if (l > 0) {
			l = 1 / Math.sqrt(l);
		}
		x *= l;
		y *= l;
		return this;
	}

	// === SCALAR INPUT METHODS ===

	randomize(scale = 1) {
		const r = Math.random() * 2.0 * Math.PI;
		x = Math.cos(r) * scale;
		y = Math.sin(r) * scale;
		return this;
	}

	multiply(scale) {
		x *= scale;
		y *= scale;
		return this;
	}

	divide(scale) {
		x /= scale;
		y /= scale;
		return this;
	}

	rotate(angle) {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const rx = x * cos - y * sin;
		y = x * sin + y * cos;
		x = rx;
		return this;
	}

	// === VECTOR INPUT METHODS ===

	add(v) {
		x += v.x;
		y += v.y;
		return this;
	}

	subtract(v) {
		x -= v.x;
		y -= v.y;
		return this;
	}

	sclAdd(v, scale) {
		x += v.x * scale;
		y += v.y * scale;
		return this;
	}
}
