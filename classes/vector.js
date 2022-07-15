export default class Vector {
	#x;
	#y;
	#z;

	constructor(x = 0, y = 0, z = 0) {
		this.#x = x;
		this.#y = y;
		this.#z = z;
	}

	get x() {
		return this.#x;
	}
	get y() {
		return this.#y;
	}
	get z() {
		return this.#z;
	}

	set x(x) {
		this.#x = x;
	}
	set y(y) {
		this.#y = y;
	}
	set z(z) {
		this.#z = z;
	}

	static add = (vector, otherVector) => {
		return new Vector(
			vector.x + otherVector.x,
			vector.y + otherVector.y,
			vector.z + otherVector.z
		);
	};

	add = (otherVector) => {
		this.#x += otherVector.x;
		this.#y += otherVector.y;
		this.#z += otherVector.z;

		return this;
	};

	static sub(vector, otherVector) {
		return new Vector(
			vector.x - otherVector.x,
			vector.y - otherVector.y,
			vector.z - otherVector.z
		);
	}

	sub(otherVector) {
		this.#x -= otherVector.x;
		this.#y -= otherVector.y;
		this.#z -= otherVector.z;

		return this;
	}

	static mult(vector, scalar) {
		return new Vector(
			vector.x * scalar,
			vector.y * scalar,
			vector.z * scalar
		);
	}

	mult(scalar) {
		this.#x *= scalar;
		this.#y *= scalar;
		this.#z *= scalar;

		return this;
	}

	static div(vector, scalar) {
		return new Vector(
			vector.x / scalar,
			vector.y / scalar,
			vector.z / scalar
		);
	}

	div(scalar) {
		this.#x /= scalar;
		this.#y /= scalar;
		this.#z /= scalar;

		return this;
	}

	static magnitude(vector) {
		return Math.sqrt(
			Math.pow(vector.x, 2) +
				Math.pow(vector.y, 2) +
				Math.pow(vector.z, 2)
		);
	}

	magnitude() {
		return Math.sqrt(
			Math.pow(this.#x, 2) + Math.pow(this.#y, 2) + Math.pow(this.#z, 2)
		);
	}

	static normalize(vector) {
		return vector.div(vector.magnitude());
	}

	normalize() {
		this.div(this.magnitude());

		return this;
	}

	static dist(vector, otherVector) {
		let newVec = Vector.sub(vector, otherVector);
		return Math.sqrt(Math.pow(newVec.x, 2) + Math.pow(newVec.y, 2));
	}

	dist(otherVector) {
		let newVec = Vector.sub(this, otherVector);
		return Math.sqrt(Math.pow(newVec.x, 2) + Math.pow(newVec.y, 2));
	}

	static limit(vector, max) {
		let mag = Math.pow(vector.magnitude(), 2);
		if (mag > Math.pow(max, 2)) {
			return vector.normalize().mult(max);
		}
		return vector;
	}

	limit(max) {
		let mag = Math.pow(this.magnitude(), 2);
		if (mag > Math.pow(max, 2)) {
			this.normalize();
			this.mult(max);
		}

		return this;
	}

	static setMagnitude(vector, x) {
		return vector.normalize().mult(x);
	}

	setMagnitude(x) {
		this.normalize();
		this.mult(x);

		return this;
	}

	static getAngle(vector, deg) {
		let angle = Math.atan2(vector.y, vector.x);
		if (deg === 'deg') {
			angle = angle * (180 / Math.PI);
		}
		return angle;
	}

	getAngle(deg = false) {
		let angle = Math.atan2(this.#y, this.#x);
		if (deg === 'deg') {
			angle *= 180 / Math.PI;
		}
		return angle;
	}
}
