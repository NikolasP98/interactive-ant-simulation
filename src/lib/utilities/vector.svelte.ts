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

	public x: number = $state(0);
	public y: number = $state(0);

	constructor(newX?: number, newY?: number) {
		this.x = newX || 0;
		this.y = newY || 0;
	}

	// === GETTERS / SETTERS ===
	// toString(radix = 10) {
	// 	return `${x.toString(radix)},${y.toString(radix)}`;
	// }

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

	limit = (max): Vector2D => {
		if (this.sqrMag > max * max) {
			this.normalize();
			this.multiply(max);
		}
		return this;
	};

	distance = (v): number => {
		return Math.hypot(this.x - v.x, this.y - v.y);
	};

	dot = (v): number => {
		return v.x * this.x + v.y * this.y;
	};

	// === UNARY METHODS (SETTERS W/ NO INPUT) ===

	zero = (): Vector2D => {
		this.x = 0;
		this.y = 0;
		return this;
	};

	normalize = (): Vector2D => {
		let l = this.sqrMag;
		if (l > 0) {
			l = 1 / Math.sqrt(l);
		}
		this.x *= l;
		this.y *= l;
		return this;
	};

	// === SCALAR INPUT METHODS ===

	randomize = (scale = 1): Vector2D => {
		const r = Math.random() * 2.0 * Math.PI;
		this.x = Math.cos(r) * scale;
		this.y = Math.sin(r) * scale;
		return this;
	};

	multiply = (scale): Vector2D => {
		this.x *= scale;
		this.y *= scale;
		return this;
	};

	divide = (scale): Vector2D => {
		this.x /= scale;
		this.y /= scale;
		return this;
	};

	rotate = (angle): Vector2D => {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const rx = this.x * cos - this.y * sin;
		this.y = this.x * sin + this.y * cos;
		this.x = rx;
		return this;
	};

	// === VECTOR INPUT METHODS ===

	add = (v): Vector2D => {
		this.x += v.x;
		this.y += v.y;
		return this;
	};

	subtract = (v): Vector2D => {
		this.x -= v.x;
		this.y -= v.y;
		return this;
	};

	sclAdd = (v, scale): Vector2D => {
		this.x += v.x * scale;
		this.y += v.y * scale;
		return this;
	};

	follow = (target: Vector2D, maxSpeed: number, maxForce: number): Vector2D => {
		const desiredVelocity = target.subtract(this).normalize().multiply(maxSpeed);
		const steerForce = desiredVelocity.subtract(this.velocity).limit(maxForce);

		this.acceleration.add(steerForce);

		return this;
	};

	clone = (): Vector2D => {
		return new Vector2D(this.x, this.y);
	};
}
