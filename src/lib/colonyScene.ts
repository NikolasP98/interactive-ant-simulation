import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SENSOR_OFFSETS, type AntAgent, type ColonySimulation, type FoodSource, type Obstacle } from './simulation';

export type ColonyView = 'habitat' | 'signals' | 'map';
export type ResourcePreset = 'conserve' | 'balanced' | 'full';
export type VisionStatus = 'search' | 'signal' | 'return' | 'recover';

const maximumAnts = 160;

const scratch = new THREE.Object3D();
const scratchColor = new THREE.Color();
const yAxis = new THREE.Vector3(0, 1, 0);
const appendageDirection = new THREE.Vector3();
const grassColor = new THREE.Color('#91ad6a');
const homeSignalColor = new THREE.Color('#2ba9eb');
const foodSignalColor = new THREE.Color('#ff6848');
const warningSignalColor = new THREE.Color('#d34b83');
const neutralSignalColor = new THREE.Color('#8f9588');
const visionStatusColors: Record<VisionStatus, THREE.Color> = {
	search: new THREE.Color('#f0c84b'),
	signal: new THREE.Color('#b7d928'),
	return: new THREE.Color('#2ba9eb'),
	recover: new THREE.Color('#d34b83')
};

function labelSprite(text: string, accent: string, scale = 1): THREE.Sprite {
	const canvas = document.createElement('canvas');
	canvas.width = 1024;
	canvas.height = 176;
	const context = canvas.getContext('2d')!;
	context.fillStyle = '#f7f4e9';
	context.fillRect(4, 4, 1016, 168);
	context.strokeStyle = '#293029';
	context.lineWidth = 6;
	context.strokeRect(4, 4, 1016, 168);
	context.fillStyle = accent;
	context.fillRect(4, 4, 22, 168);
	context.fillStyle = '#293029';
	context.font = '700 78px ui-monospace, SFMono-Regular, Menlo, monospace';
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillText(text, 524, 90);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.minFilter = THREE.LinearFilter;
	texture.generateMipmaps = true;
	const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
	const sprite = new THREE.Sprite(material);
	sprite.scale.set(3.45 * scale, 0.6 * scale, 1);
	sprite.frustumCulled = false;
	return sprite;
}

function rectangularGrid(width: number, depth: number): THREE.LineSegments {
	const vertices: number[] = [];
	for (let x = -width / 2; x <= width / 2 + 0.01; x += 1) {
		vertices.push(x, 0.5, -depth / 2, x, 0.5, depth / 2);
	}
	for (let z = -depth / 2; z <= depth / 2 + 0.01; z += 1) {
		vertices.push(-width / 2, 0.5, z, width / 2, 0.5, z);
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
	return new THREE.LineSegments(
		geometry,
		new THREE.LineBasicMaterial({ color: '#53634a', transparent: true, opacity: 0.13 })
	);
}

function foodVisual(food: FoodSource, fullShadows: boolean): THREE.Group {
	const group = new THREE.Group();
	const baseColor = new THREE.Color(food.color);
	const colors = [baseColor, baseColor.clone().offsetHSL(0.04, 0.08, 0.1), new THREE.Color('#d8ed57')];
	const pieces = 5 + food.value * 2;
	for (let index = 0; index < pieces; index += 1) {
		const crumb = new THREE.Mesh(
			new THREE.DodecahedronGeometry(0.14 + food.value * 0.022 + (index % 3) * 0.025, 0),
			new THREE.MeshStandardMaterial({ color: colors[index % colors.length], roughness: 0.76 })
		);
		const angle = (index / pieces) * Math.PI * 2;
		const ring = 0.23 + (index % 3) * 0.07;
		crumb.position.set(Math.cos(angle) * ring, 0.14 + (index % 2) * 0.12, Math.sin(angle) * ring);
		crumb.rotation.set(index * 0.3, index * 0.7, index * 0.2);
		crumb.castShadow = fullShadows;
		crumb.frustumCulled = false;
		group.add(crumb);
	}
	group.frustumCulled = false;
	return group;
}

function obstacleVisual(obstacle: Obstacle, fullShadows: boolean): THREE.Group {
	const group = new THREE.Group();
	if (obstacle.kind === 'log') {
		const bark = new THREE.MeshStandardMaterial({ color: '#6f5034', roughness: 0.98 });
		const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, 1.55, 12), bark);
		log.rotation.z = Math.PI / 2;
		log.position.y = 0.22;
		log.castShadow = fullShadows;
		log.frustumCulled = false;
		group.rotation.y = 0.42 + Number(obstacle.id.replace(/\D/g, '') || 0) * 0.77;
		group.add(log);
		for (const side of [-1, 1]) {
			const cap = new THREE.Mesh(
				new THREE.CircleGeometry(side < 0 ? 0.24 : 0.29, 12),
				new THREE.MeshStandardMaterial({ color: '#b18a56', roughness: 1 })
			);
			cap.rotation.y = side * Math.PI / 2;
			cap.position.set(side * 0.78, 0.22, 0);
			cap.frustumCulled = false;
			group.add(cap);
		}
	} else {
		for (let index = 0; index < 4; index += 1) {
			const rock = new THREE.Mesh(
				new THREE.DodecahedronGeometry(0.3 + (index % 2) * 0.1, 0),
				new THREE.MeshStandardMaterial({ color: index % 2 ? '#7f8377' : '#a0a395', roughness: 1 })
			);
			const angle = (index / 4) * Math.PI * 2;
			rock.position.set(Math.cos(angle) * 0.3, 0.19 + (index % 2) * 0.08, Math.sin(angle) * 0.26);
			rock.rotation.set(index, index * 0.35, index * 0.7);
			rock.castShadow = fullShadows;
			rock.frustumCulled = false;
			group.add(rock);
		}
	}
	group.position.set(obstacle.x, 0.58, obstacle.z);
	group.frustumCulled = false;
	return group;
}

export class ColonyScene {
	readonly renderer: THREE.WebGLRenderer;
	readonly scene = new THREE.Scene();
	readonly camera = new THREE.OrthographicCamera(-9, 9, 6, -6, 0.1, 80);
	readonly controls: OrbitControls;

	private simulation: ColonySimulation;
	private canvas: HTMLCanvasElement;
	private preset: ResourcePreset;
	private view: ColonyView = 'habitat';
	private bodyMeshes: THREE.InstancedMesh[] = [];
	private legMeshes: THREE.InstancedMesh[] = [];
	private antennaMeshes: THREE.InstancedMesh[] = [];
	private cargoMesh: THREE.InstancedMesh;
	private pheromoneMeshes: Record<'home' | 'food' | 'warning', THREE.InstancedMesh>;
	private pheromoneSpotScale = 1;
	private visionCones: THREE.InstancedMesh;
	private visionRays: THREE.LineSegments;
	private visionRayPositions = new Float32Array(maximumAnts * SENSOR_OFFSETS.length * 6);
	private visionRayColors = new Float32Array(maximumAnts * SENSOR_OFFSETS.length * 6);
	private visionRings: THREE.InstancedMesh;
	private selectionRing: THREE.Mesh;
	private visionVisible = true;
	private visionStatuses = new Set<VisionStatus>(['search', 'signal', 'return', 'recover']);
	private selectedAntIndex: number | null = null;
	private foodGroups = new Map<string, THREE.Group>();
	private foodLabels = new Map<string, THREE.Sprite>();
	private obstacleGroups = new Map<string, THREE.Group>();
	private nestLabel = labelSprite('NEST / HOME', '#4e91bd');
	private frameCount = 0;

	constructor(canvas: HTMLCanvasElement, simulation: ColonySimulation, preset: ResourcePreset) {
		this.canvas = canvas;
		this.simulation = simulation;
		this.preset = preset;
		this.renderer = new THREE.WebGLRenderer({ canvas, antialias: preset !== 'conserve', alpha: true });
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.setClearColor(0xf3f0e6, 1);
		this.renderer.setPixelRatio(
			preset === 'conserve' ? 1 : Math.min(window.devicePixelRatio || 1, preset === 'full' ? 2 : 1.55)
		);
		this.renderer.shadowMap.enabled = preset === 'full';
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

		this.camera.position.set(20, 16, 20);
		this.controls = new OrbitControls(this.camera, canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.08;
		this.controls.enablePan = false;
		this.controls.minZoom = 0.5;
		this.controls.maxZoom = 2.35;
		this.controls.minPolarAngle = 0.16;
		this.controls.maxPolarAngle = Math.PI / 2.16;
		this.controls.target.set(0, 0.28, 0);

		this.scene.add(new THREE.HemisphereLight(0xfff9e9, 0x59654f, 2.1));
		const sunlight = new THREE.DirectionalLight(0xfff5d7, 3.1);
		sunlight.position.set(-7, 14, 8);
		sunlight.castShadow = preset === 'full';
		this.scene.add(sunlight);

		const soil = new THREE.Mesh(
			new THREE.BoxGeometry(simulation.width + 0.65, 0.72, simulation.depth + 0.65),
			new THREE.MeshStandardMaterial({ color: '#82765f', roughness: 0.95 })
		);
		soil.position.y = 0.03;
		soil.receiveShadow = true;
		this.scene.add(soil);
		const turf = new THREE.Mesh(
			new THREE.BoxGeometry(simulation.width + 0.18, 0.24, simulation.depth + 0.18),
			new THREE.MeshStandardMaterial({ color: grassColor, roughness: 1 })
		);
		turf.position.y = 0.46;
		turf.receiveShadow = true;
		this.scene.add(turf, rectangularGrid(simulation.width, simulation.depth));

		const nestMound = new THREE.Mesh(
			new THREE.SphereGeometry(0.78, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
			new THREE.MeshStandardMaterial({ color: '#a98d5c', roughness: 1 })
		);
		nestMound.scale.y = 0.46;
		nestMound.position.set(simulation.nest.x, 0.52, simulation.nest.z);
		this.scene.add(nestMound);
		const entrance = new THREE.Mesh(
			new THREE.CircleGeometry(0.25, 24),
			new THREE.MeshBasicMaterial({ color: '#181c18' })
		);
		entrance.rotation.x = -Math.PI / 2;
		entrance.position.set(simulation.nest.x, 0.77, simulation.nest.z);
		this.scene.add(entrance);

		for (const food of simulation.foods) {
			const group = foodVisual(food, preset === 'full');
			this.foodGroups.set(food.id, group);
			this.scene.add(group);
			const label = labelSprite(food.label, food.color, food.value > 1 ? 1.08 : 0.94);
			this.foodLabels.set(food.id, label);
			this.scene.add(label);
		}

		const antMaterial = new THREE.MeshStandardMaterial({ color: '#2d2018', roughness: 0.72 });
		const bodyParts = [
			{ geometry: new THREE.SphereGeometry(0.11, 10, 7), offset: -0.13, scale: [1.35, 0.8, 1] },
			{ geometry: new THREE.SphereGeometry(0.09, 10, 7), offset: 0.02, scale: [1, 0.78, 0.9] },
			{ geometry: new THREE.SphereGeometry(0.075, 10, 7), offset: 0.15, scale: [1, 0.74, 0.9] }
		];
		for (const part of bodyParts) {
			const mesh = new THREE.InstancedMesh(part.geometry, antMaterial, maximumAnts);
			mesh.userData.part = part;
			mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			mesh.castShadow = preset === 'full';
			mesh.frustumCulled = false;
			this.bodyMeshes.push(mesh);
			this.scene.add(mesh);
		}

		const appendageGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.19, 5);
		const appendageMaterial = new THREE.MeshStandardMaterial({ color: '#3b281d', roughness: 0.86 });
		for (let index = 0; index < 6; index += 1) {
			const mesh = new THREE.InstancedMesh(appendageGeometry, appendageMaterial, maximumAnts);
			mesh.userData.leg = { pair: Math.floor(index / 2), side: index % 2 === 0 ? -1 : 1 };
			mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			mesh.frustumCulled = false;
			this.legMeshes.push(mesh);
			this.scene.add(mesh);
		}
		for (let index = 0; index < 2; index += 1) {
			const mesh = new THREE.InstancedMesh(
				new THREE.CylinderGeometry(0.009, 0.009, 0.17, 5),
				appendageMaterial,
				maximumAnts
			);
			mesh.userData.side = index === 0 ? -1 : 1;
			mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			mesh.frustumCulled = false;
			this.antennaMeshes.push(mesh);
			this.scene.add(mesh);
		}

		this.cargoMesh = new THREE.InstancedMesh(
			new THREE.DodecahedronGeometry(0.075, 0),
			new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.72 }),
			maximumAnts
		);
		this.cargoMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.cargoMesh.frustumCulled = false;
		this.scene.add(this.cargoMesh);

		const maximumPoints = simulation.columns * simulation.rows;
		const signalMaterial = (color: THREE.Color, opacity: number) =>
			new THREE.MeshBasicMaterial({
				color,
				transparent: true,
				opacity,
				depthWrite: false,
				depthTest: true,
				polygonOffset: true,
				polygonOffsetFactor: -2,
				side: THREE.DoubleSide
			});
		this.pheromoneMeshes = {
			home: new THREE.InstancedMesh(
				new THREE.CircleGeometry(0.5, 12),
				signalMaterial(homeSignalColor, 0.9),
				maximumPoints
			),
			food: new THREE.InstancedMesh(
				new THREE.RingGeometry(0.3, 0.5, 14),
				signalMaterial(foodSignalColor, 0.86),
				maximumPoints
			),
			warning: new THREE.InstancedMesh(
				new THREE.RingGeometry(0.27, 0.5, 4),
				signalMaterial(warningSignalColor, 0.9),
				maximumPoints
			)
		};
		for (const [index, mesh] of Object.values(this.pheromoneMeshes).entries()) {
			mesh.count = 0;
			mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			mesh.frustumCulled = false;
			mesh.renderOrder = 2 + index;
			this.scene.add(mesh);
		}

		const coneGeometry = new THREE.BufferGeometry();
		coneGeometry.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(
				[
					0,
					0,
					0,
					Math.cos(SENSOR_OFFSETS[0]),
					0,
					Math.sin(SENSOR_OFFSETS[0]),
					Math.cos(SENSOR_OFFSETS[SENSOR_OFFSETS.length - 1]),
					0,
					Math.sin(SENSOR_OFFSETS[SENSOR_OFFSETS.length - 1])
				],
				3
			)
		);
		this.visionCones = new THREE.InstancedMesh(
			coneGeometry,
			new THREE.MeshBasicMaterial({
				color: '#ffffff',
				transparent: true,
				opacity: 0.055,
				depthWrite: false,
				side: THREE.DoubleSide
			}),
			maximumAnts
		);
		this.visionCones.count = 0;
		this.visionCones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.visionCones.frustumCulled = false;
		this.visionCones.renderOrder = 3;
		this.scene.add(this.visionCones);

		const visionRayGeometry = new THREE.BufferGeometry();
		visionRayGeometry.setAttribute('position', new THREE.BufferAttribute(this.visionRayPositions, 3));
		visionRayGeometry.setAttribute('color', new THREE.BufferAttribute(this.visionRayColors, 3));
		this.visionRays = new THREE.LineSegments(
			visionRayGeometry,
			new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.46, depthTest: false })
		);
		visionRayGeometry.setDrawRange(0, 0);
		this.visionRays.frustumCulled = false;
		this.visionRays.renderOrder = 5;
		this.scene.add(this.visionRays);

		this.visionRings = new THREE.InstancedMesh(
			new THREE.RingGeometry(0.22, 0.28, 24),
			new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
			maximumAnts
		);
		this.visionRings.count = 0;
		this.visionRings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.visionRings.frustumCulled = false;
		this.visionRings.renderOrder = 5;
		this.scene.add(this.visionRings);

		this.selectionRing = new THREE.Mesh(
			new THREE.RingGeometry(0.34, 0.43, 28),
			new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, side: THREE.DoubleSide })
		);
		this.selectionRing.rotation.x = -Math.PI / 2;
		this.selectionRing.frustumCulled = false;
		this.selectionRing.renderOrder = 7;
		this.selectionRing.visible = false;
		this.scene.add(this.selectionRing);

		this.nestLabel.position.set(simulation.nest.x, 1.55, simulation.nest.z);
		this.scene.add(this.nestLabel);
		this.setView('habitat');
	}

	setView(view: ColonyView): void {
		if (view === 'map') return;
		this.view = view;
		if (view === 'signals') {
			this.camera.position.set(0.01, 27, 0.01);
			this.camera.zoom = 0.95;
			this.controls.target.set(0, 0.25, 0);
			this.pheromoneSpotScale = 1.16;
			(this.pheromoneMeshes.home.material as THREE.MeshBasicMaterial).opacity = 0.96;
			(this.pheromoneMeshes.food.material as THREE.MeshBasicMaterial).opacity = 0.92;
			(this.pheromoneMeshes.warning.material as THREE.MeshBasicMaterial).opacity = 0.96;
		} else {
			this.camera.position.set(20, 16, 20);
			this.camera.zoom = 0.92;
			this.controls.target.set(0, 0.28, 0);
			this.pheromoneSpotScale = 1;
			(this.pheromoneMeshes.home.material as THREE.MeshBasicMaterial).opacity = 0.82;
			(this.pheromoneMeshes.food.material as THREE.MeshBasicMaterial).opacity = 0.78;
			(this.pheromoneMeshes.warning.material as THREE.MeshBasicMaterial).opacity = 0.86;
		}
		this.controls.enableRotate = true;
		this.camera.updateProjectionMatrix();
		this.controls.update();
	}

	resetOrbit(): void {
		this.setView(this.view === 'signals' ? 'signals' : 'habitat');
	}

	setSignalsVisible(visible: boolean): void {
		for (const mesh of Object.values(this.pheromoneMeshes)) mesh.visible = visible;
	}

	setVisionVisible(visible: boolean): void {
		this.visionVisible = visible;
		this.visionCones.visible = visible;
		this.visionRays.visible = visible;
		this.visionRings.visible = visible;
		this.selectionRing.visible = visible && this.selectedAntIndex !== null;
	}

	setVisionStatuses(statuses: VisionStatus[]): void {
		this.visionStatuses = new Set(statuses);
	}

	setSelectedAnt(index: number | null): void {
		this.selectedAntIndex = index;
		this.selectionRing.visible = this.visionVisible && index !== null;
	}

	antAt(clientX: number, clientY: number, radius = 0.62): number | null {
		const point = this.groundPoint(clientX, clientY);
		if (!point) return null;
		let nearestIndex: number | null = null;
		let nearestDistance = radius;
		for (let index = 0; index < this.simulation.ants.length; index += 1) {
			const ant = this.simulation.ants[index];
			const distance = Math.hypot(ant.x - point.x, ant.z - point.z);
			if (distance >= nearestDistance) continue;
			nearestDistance = distance;
			nearestIndex = index;
		}
		return nearestIndex;
	}

	resize(width: number, height: number): void {
		if (!width || !height) return;
		this.renderer.setSize(width, height, false);
		const aspect = width / height;
		const halfHeight =
			aspect < 1
				? this.simulation.width / (2 * aspect) + 1.4
				: Math.max(10.6, this.simulation.depth / 2 + 0.6);
		this.camera.left = -halfHeight * aspect;
		this.camera.right = halfHeight * aspect;
		this.camera.top = halfHeight;
		this.camera.bottom = -halfHeight;
		this.camera.updateProjectionMatrix();
	}

	groundPoint(clientX: number, clientY: number): { x: number; z: number } | null {
		const rect = this.canvas.getBoundingClientRect();
		const pointer = new THREE.Vector2(
			((clientX - rect.left) / rect.width) * 2 - 1,
			-((clientY - rect.top) / rect.height) * 2 + 1
		);
		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(pointer, this.camera);
		const point = new THREE.Vector3();
		return raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.58), point)
			? { x: point.x, z: point.z }
			: null;
	}

	render(): void {
		this.frameCount += 1;
		this.controls.update();
		this.syncFoodVisuals();
		this.syncObstacleVisuals();
		this.updateAntInstances();
		this.updateVision();
		if (this.frameCount % (this.preset === 'conserve' ? 5 : 3) === 0) this.updatePheromones();
		this.renderer.render(this.scene, this.camera);
	}

	dispose(): void {
		this.controls.dispose();
		this.scene.traverse((object) => {
			const renderable = object as THREE.Object3D & {
				geometry?: THREE.BufferGeometry;
				material?: THREE.Material | THREE.Material[];
			};
			renderable.geometry?.dispose();
			const materials = renderable.material
				? Array.isArray(renderable.material)
					? renderable.material
					: [renderable.material]
				: [];
			for (const material of materials) {
				if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
				material.dispose();
			}
		});
		this.renderer.dispose();
	}

	private syncFoodVisuals(): void {
		for (const food of this.simulation.foods) {
			this.foodGroups.get(food.id)?.position.set(food.x, 0.58, food.z);
			this.foodLabels.get(food.id)?.position.set(food.x, 1.52, food.z);
		}
	}

	private syncObstacleVisuals(): void {
		const activeIds = new Set(this.simulation.obstacles.map((obstacle) => obstacle.id));
		for (const [id, group] of this.obstacleGroups) {
			if (activeIds.has(id)) continue;
			this.scene.remove(group);
			this.obstacleGroups.delete(id);
		}
		for (const obstacle of this.simulation.obstacles) {
			if (this.obstacleGroups.has(obstacle.id)) continue;
			const group = obstacleVisual(obstacle, this.preset === 'full');
			this.obstacleGroups.set(obstacle.id, group);
			this.scene.add(group);
		}
	}

	private updateAntInstances(): void {
		const ants = this.simulation.ants;
		for (const mesh of this.bodyMeshes) {
			const part = mesh.userData.part as { offset: number; scale: number[] };
			for (let index = 0; index < ants.length; index += 1) {
				const ant = ants[index];
				const bob = this.antBob(ant);
				scratch.position.set(
					ant.x + Math.cos(ant.angle) * part.offset,
					0.72 + bob,
					ant.z + Math.sin(ant.angle) * part.offset
				);
				scratch.rotation.set(0, -ant.angle, 0);
				scratch.scale.set(part.scale[0], part.scale[1], part.scale[2]);
				scratch.updateMatrix();
				mesh.setMatrixAt(index, scratch.matrix);
			}
			mesh.count = ants.length;
			mesh.instanceMatrix.needsUpdate = true;
		}

		const legBaseAngles = [0.92, Math.PI / 2, 2.22];
		const legOffsets = [0.07, 0, -0.075];
		for (const mesh of this.legMeshes) {
			const { pair, side } = mesh.userData.leg as { pair: number; side: number };
			for (let index = 0; index < ants.length; index += 1) {
				const ant = ants[index];
				const stillness = ant.action === 'pickup' || ant.action === 'unload' ? 0.18 : 1;
				const sway = Math.sin(ant.phase + pair * Math.PI + (side > 0 ? Math.PI : 0)) * 0.2 * stillness;
				const direction = ant.angle + side * legBaseAngles[pair] + sway;
				const forwardOffset = legOffsets[pair];
				const startX =
					ant.x + Math.cos(ant.angle) * forwardOffset + Math.cos(ant.angle + side * Math.PI / 2) * 0.055;
				const startZ =
					ant.z + Math.sin(ant.angle) * forwardOffset + Math.sin(ant.angle + side * Math.PI / 2) * 0.055;
				this.setAppendageMatrix(mesh, index, startX, startZ, 0.69 + this.antBob(ant), direction, 0.19);
			}
			mesh.count = ants.length;
			mesh.instanceMatrix.needsUpdate = true;
		}

		for (const mesh of this.antennaMeshes) {
			const side = mesh.userData.side as number;
			for (let index = 0; index < ants.length; index += 1) {
				const ant = ants[index];
				const direction = ant.angle + side * (0.3 + Math.sin(ant.phase * 0.42 + side) * 0.08);
				const startX = ant.x + Math.cos(ant.angle) * 0.19 + Math.cos(ant.angle + side * Math.PI / 2) * 0.025;
				const startZ = ant.z + Math.sin(ant.angle) * 0.19 + Math.sin(ant.angle + side * Math.PI / 2) * 0.025;
				this.setAppendageMatrix(mesh, index, startX, startZ, 0.735 + this.antBob(ant), direction, 0.17);
			}
			mesh.count = ants.length;
			mesh.instanceMatrix.needsUpdate = true;
		}

		for (let index = 0; index < ants.length; index += 1) {
			const ant = ants[index];
			const cargo = this.cargoPose(ant);
			scratch.position.set(
				ant.x + Math.cos(ant.angle) * cargo.offset,
				cargo.y + this.antBob(ant),
				ant.z + Math.sin(ant.angle) * cargo.offset
			);
			scratch.rotation.set(ant.phase * 0.04, ant.angle, ant.phase * 0.06);
			scratch.scale.setScalar(ant.hasFood ? 1 + ant.carryingValue * 0.06 : 0.001);
			scratch.updateMatrix();
			this.cargoMesh.setMatrixAt(index, scratch.matrix);
			const food = this.simulation.foods.find((source) => source.id === ant.carryingFoodId);
			scratchColor.set(food?.color ?? '#e6c842');
			this.cargoMesh.setColorAt(index, scratchColor);
		}
		this.cargoMesh.count = ants.length;
		this.cargoMesh.instanceMatrix.needsUpdate = true;
		if (this.cargoMesh.instanceColor) this.cargoMesh.instanceColor.needsUpdate = true;
	}

	private setAppendageMatrix(
		mesh: THREE.InstancedMesh,
		index: number,
		startX: number,
		startZ: number,
		y: number,
		direction: number,
		length: number
	): void {
		appendageDirection.set(Math.cos(direction), -0.08, Math.sin(direction)).normalize();
		scratch.position.set(
			startX + appendageDirection.x * length * 0.5,
			y + appendageDirection.y * length * 0.5,
			startZ + appendageDirection.z * length * 0.5
		);
		scratch.quaternion.setFromUnitVectors(yAxis, appendageDirection);
		scratch.scale.set(1, 1, 1);
		scratch.updateMatrix();
		mesh.setMatrixAt(index, scratch.matrix);
	}

	private antBob(ant: AntAgent): number {
		const actionLift =
			ant.action === 'pickup' ? Math.sin(ant.actionProgress * Math.PI) * 0.035 : ant.action === 'unload' ? -0.015 : 0;
		return Math.sin(ant.phase) * 0.018 + actionLift;
	}

	private cargoPose(ant: AntAgent): { offset: number; y: number } {
		if (ant.action === 'pickup') {
			return { offset: 0.3 - ant.actionProgress * 0.05, y: 0.66 + ant.actionProgress * 0.2 };
		}
		if (ant.action === 'unload') {
			return { offset: 0.25 * (1 - ant.actionProgress), y: 0.86 - ant.actionProgress * 0.18 };
		}
		return { offset: 0.25, y: 0.86 };
	}

	private updateVision(): void {
		if (!this.visionVisible) return;
		const sensorDistance = this.sensorDistance();
		let visibleAnts = 0;
		let visibleRays = 0;
		for (let antIndex = 0; antIndex < this.simulation.ants.length; antIndex += 1) {
			const ant = this.simulation.ants[antIndex];
			const status = this.visionStatus(ant);
			if (!this.visionStatuses.has(status)) continue;

			scratch.position.set(ant.x, 0.735, ant.z);
			scratch.rotation.set(0, -ant.angle, 0);
			scratch.scale.setScalar(sensorDistance);
			scratch.updateMatrix();
			this.visionCones.setMatrixAt(visibleAnts, scratch.matrix);
			this.visionCones.setColorAt(visibleAnts, visionStatusColors[status]);

			scratch.position.set(ant.x, 0.746, ant.z);
			scratch.rotation.set(-Math.PI / 2, 0, 0);
			scratch.scale.setScalar(1);
			scratch.updateMatrix();
			this.visionRings.setMatrixAt(visibleAnts, scratch.matrix);
			this.visionRings.setColorAt(visibleAnts, visionStatusColors[status]);

			for (let sensorIndex = 0; sensorIndex < SENSOR_OFFSETS.length; sensorIndex += 1) {
				const direction = ant.angle + SENSOR_OFFSETS[sensorIndex];
				const offset = visibleRays * 6;
				this.visionRayPositions[offset] = ant.x;
				this.visionRayPositions[offset + 1] = 0.765;
				this.visionRayPositions[offset + 2] = ant.z;
				this.visionRayPositions[offset + 3] = ant.x + Math.cos(direction) * sensorDistance;
				this.visionRayPositions[offset + 4] = 0.765;
				this.visionRayPositions[offset + 5] = ant.z + Math.sin(direction) * sensorDistance;
				const warning = ant.sensorWarnings[sensorIndex];
				const signal = ant.sensorReadings[sensorIndex];
				const base =
					warning > signal * 0.7
						? warningSignalColor
						: ant.sensorKind === 'home'
							? homeSignalColor
							: foodSignalColor;
				scratchColor
					.copy(base)
					.lerp(neutralSignalColor, Math.max(0, 0.72 - Math.max(signal, warning) * 1.5));
				for (const vertexOffset of [offset, offset + 3]) {
					this.visionRayColors[vertexOffset] = scratchColor.r;
					this.visionRayColors[vertexOffset + 1] = scratchColor.g;
					this.visionRayColors[vertexOffset + 2] = scratchColor.b;
				}
				visibleRays += 1;
			}
			visibleAnts += 1;
		}

		this.visionCones.count = visibleAnts;
		this.visionCones.instanceMatrix.needsUpdate = true;
		if (this.visionCones.instanceColor) this.visionCones.instanceColor.needsUpdate = true;
		this.visionRings.count = visibleAnts;
		this.visionRings.instanceMatrix.needsUpdate = true;
		if (this.visionRings.instanceColor) this.visionRings.instanceColor.needsUpdate = true;
		this.visionRays.geometry.setDrawRange(0, visibleRays * 2);
		(this.visionRays.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
		(this.visionRays.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

		const selectedAnt =
			this.selectedAntIndex === null ? null : this.simulation.ants[this.selectedAntIndex] ?? null;
		if (selectedAnt) {
			this.selectionRing.visible = true;
			this.selectionRing.position.set(selectedAnt.x, 0.756, selectedAnt.z);
		} else this.selectionRing.visible = false;
	}

	private visionStatus(ant: AntAgent): VisionStatus {
		if (ant.hasFood) return 'return';
		if (ant.decision === 'recover' || ant.decision === 'edge') return 'recover';
		if (ant.decision === 'signal' || ant.decision === 'goal') return 'signal';
		return 'search';
	}

	private sensorDistance(): number {
		return this.simulation.settings.temperament === 'curious'
			? 0.92
			: this.simulation.settings.temperament === 'disciplined'
				? 1.12
				: 1.02;
	}

	private updatePheromones(): void {
		const { columns, rows, width, depth, homeTrail, foodTrail, warningTrail } = this.simulation;
		let homeMax = 0.001;
		let foodMax = 0.001;
		let warningMax = 0.001;
		for (let index = 0; index < homeTrail.length; index += 1) {
			homeMax = Math.max(homeMax, homeTrail[index]);
			foodMax = Math.max(foodMax, foodTrail[index]);
			warningMax = Math.max(warningMax, warningTrail[index]);
		}
		const counts = { home: 0, food: 0, warning: 0 };
		const fields = [
			{
				kind: 'food' as const,
				trail: foodTrail,
				maximum: foodMax,
				threshold: Math.max(0.008, foodMax * 0.035),
				y: 0.589,
				minimum: 0.3,
				range: 0.24
			},
			{
				kind: 'home' as const,
				trail: homeTrail,
				maximum: homeMax,
				threshold: Math.max(0.008, homeMax * 0.035),
				y: 0.592,
				minimum: 0.15,
				range: 0.17
			},
			{
				kind: 'warning' as const,
				trail: warningTrail,
				maximum: warningMax,
				threshold: Math.max(0.018, warningMax * 0.11),
				y: 0.595,
				minimum: 0.24,
				range: 0.2
			}
		];
		for (let row = 0; row < rows; row += 1) {
			for (let column = 0; column < columns; column += 1) {
				const index = row * columns + column;
				for (const field of fields) {
					const value = field.trail[index];
					if (value < field.threshold) continue;
					const strength = Math.sqrt(value / field.maximum);
					const size = (field.minimum + strength * field.range) * this.pheromoneSpotScale;
					scratch.position.set(
						-width / 2 + ((column + 0.5) / columns) * width,
						field.y,
						-depth / 2 + ((row + 0.5) / rows) * depth
					);
					scratch.rotation.set(-Math.PI / 2, 0, field.kind === 'warning' ? Math.PI / 4 : 0);
					scratch.scale.set(size, size, 1);
					scratch.updateMatrix();
					this.pheromoneMeshes[field.kind].setMatrixAt(counts[field.kind], scratch.matrix);
					counts[field.kind] += 1;
				}
			}
		}
		for (const kind of ['home', 'food', 'warning'] as const) {
			const mesh = this.pheromoneMeshes[kind];
			mesh.count = counts[kind];
			mesh.instanceMatrix.needsUpdate = true;
		}
	}
}
