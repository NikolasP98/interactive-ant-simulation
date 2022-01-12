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

	add = (otherVector) => {
		return new Vector(
			this.#x + otherVector.x,
			this.#y + otherVector.y,
			this.#z + otherVector.z
		);
	};

	sub(otherVector) {
		return new Vector(
			this.#x - otherVector.x,
			this.#y - otherVector.y,
			this.#z - otherVector.z
		);
	}
	mult(scalar) {
		return new Vector(this.#x * scalar, this.#y * scalar, this.#z * scalar);
	}

	div(scalar) {
		return new Vector(this.#x / scalar, this.#y / scalar, this.#z / scalar);
	}

	magnitude() {
		return Math.sqrt(
			Math.pow(this.#x, 2) + Math.pow(this.#y, 2) + Math.pow(this.#z, 2)
		);
	}

	normalize() {
		return this.div(this.magnitude());
	}

	dist(otherVector) {
		let newVec = this.sub(otherVector);
		return Math.sqrt(Math.pow(newVec.x, 2) + Math.pow(newVec.y, 2));
	}

	limit(max) {
		let mag = Math.pow(this.magnitude(), 2);
		// console.log(this);
		if (mag > Math.pow(max, 2)) {
			return this.normalize().mult(max);
		}
		return this;
	}

	// Only consider Vector direction and set new magnitude to X value
	setMagnitude(x) {
		return this.normalize().mult(x);
	}
}
