import Vector from '$utils/vector.svelte';

export abstract class Entity {
	protected position: Vector = $state(new Vector());
	protected velocity: Vector = $state(new Vector());
	protected acceleration: Vector = $state(new Vector());
	protected theta: number = $state(Math.random() * 2 * Math.PI);
	protected maxSpeed: number = $state(0.5);
	protected maxForce: number = $state(0.005);

	protected radius: number = $state(10);
	protected color: string = $state('');

	constructor(x?: number, y?: number) {
		if (x && y) {
			this.position = new Vector(x || 0, y || 0);
		}
	}

	protected edges = (): void => {
		if (this.position.x > canvas.width) {
			this.position.x = 0;
		} else if (this.position.x < 0) {
			this.position.x = canvas.width;
		}
		if (this.position.y > canvas.height) {
			this.position.y = 0;
		} else if (this.position.y < 0) {
			this.position.y = canvas.height;
		}
	};

	public abstract update(ctx: CanvasRenderingContext2D): void;

	public abstract show(ctx: CanvasRenderingContext2D): void;
}

export abstract class Mob extends Entity {
	constructor() {
		super();
		this.position = new Vector();
		this.velocity = new Vector();
		this.acceleration = new Vector();
		this.theta = Math.random() * 2 * Math.PI;
		this.maxSpeed = 0.5;
		this.maxForce = 0.005;
		this.radius = 9;
		this.color = '';
	}

	protected step = (steerForce): void => {
		const steeringForce = this.velocity.clone().multiply(steerForce);

		this.acceleration.add(steeringForce);

		this.position.add(this.velocity);
		this.edges();
		this.acceleration.zero();
	};

	abstract update(ctx: CanvasRenderingContext2D): void;

	abstract show(ctx: CanvasRenderingContext2D): void;

	abstract wander(): Vector;
}
