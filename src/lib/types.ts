export type Ant {
	position: Vector;
	color: string;
	velocity: Vector;
	acceleration: Vector;
	radius: number;
	home: Vector;
	homeRadius: number;
	food: number;
	pheromones: number;
	maxSpeed: number;
	maxForce: number;
	foodCount: number;
}

export type Colony = {
	position: Vector;
	size: number;
	color: string;
}

export type Pheromone = {
	position: Vector;
	color: string;
	radius: number;
	lifeTime: number;
	type: string;
}

export type Vector = {
	x: number;
	y: number;
};