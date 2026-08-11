import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ColonySimulation } from './simulation';

export type ColonyView = 'habitat' | 'signals' | 'map';
export type ResourcePreset = 'conserve' | 'balanced' | 'full';

const scratch = new THREE.Object3D();
const scratchColor = new THREE.Color();
const grassColor = new THREE.Color('#91ad6a');
const homeSignalColor = new THREE.Color('#4e91bd');
const foodSignalColor = new THREE.Color('#df6747');

function labelSprite(text: string, accent: string): THREE.Sprite {
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
	const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
	const sprite = new THREE.Sprite(material);
	sprite.scale.set(3.45, 0.6, 1);
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
		new THREE.LineBasicMaterial({ color: '#53634a', transparent: true, opacity: 0.16 })
	);
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
	private cargoMesh: THREE.InstancedMesh;
	private pheromones: THREE.Points;
	private pheromonePositions: Float32Array;
	private pheromoneColors: Float32Array;
	private foodGroup = new THREE.Group();
	private nestLabel = labelSprite('NEST / HOME', '#4e91bd');
	private foodLabel = labelSprite('FOOD / MOVE HERE', '#df6747');
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

		this.camera.position.set(12, 10, 12);
		this.controls = new OrbitControls(this.camera, canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.08;
		this.controls.enablePan = false;
		this.controls.minZoom = 0.76;
		this.controls.maxZoom = 1.75;
		this.controls.minPolarAngle = 0.16;
		this.controls.maxPolarAngle = Math.PI / 2.22;
		this.controls.target.set(0, 0.2, 0);

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

		const foodColors = ['#d8ed57', '#e5c64f', '#c96043'];
		for (let index = 0; index < 7; index += 1) {
			const crumb = new THREE.Mesh(
				new THREE.DodecahedronGeometry(0.19 + (index % 3) * 0.035, 0),
				new THREE.MeshStandardMaterial({ color: foodColors[index % foodColors.length], roughness: 0.78 })
			);
			const angle = (index / 7) * Math.PI * 2;
			crumb.position.set(Math.cos(angle) * 0.34, 0.18 + (index % 2) * 0.13, Math.sin(angle) * 0.3);
			crumb.rotation.set(index * 0.3, index * 0.7, index * 0.2);
			crumb.castShadow = preset === 'full';
			this.foodGroup.add(crumb);
		}
		this.scene.add(this.foodGroup);

		const antMaterial = new THREE.MeshStandardMaterial({ color: '#2d2018', roughness: 0.72 });
		const bodyParts = [
			{ geometry: new THREE.SphereGeometry(0.11, 10, 7), offset: -0.13, scale: [1.35, 0.8, 1] },
			{ geometry: new THREE.SphereGeometry(0.09, 10, 7), offset: 0.02, scale: [1, 0.78, 0.9] },
			{ geometry: new THREE.SphereGeometry(0.075, 10, 7), offset: 0.15, scale: [1, 0.74, 0.9] }
		];
		for (const part of bodyParts) {
			const mesh = new THREE.InstancedMesh(part.geometry, antMaterial, 120);
			mesh.userData.part = part;
			mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
			mesh.castShadow = preset === 'full';
			this.bodyMeshes.push(mesh);
			this.scene.add(mesh);
		}
		this.cargoMesh = new THREE.InstancedMesh(
			new THREE.DodecahedronGeometry(0.07, 0),
			new THREE.MeshStandardMaterial({ color: '#f1d24b', emissive: '#6b5610', emissiveIntensity: 0.16 }),
			120
		);
		this.cargoMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.scene.add(this.cargoMesh);

		const maximumPoints = simulation.columns * simulation.rows * 2;
		this.pheromonePositions = new Float32Array(maximumPoints * 3);
		this.pheromoneColors = new Float32Array(maximumPoints * 3);
		const pheromoneGeometry = new THREE.BufferGeometry();
		pheromoneGeometry.setAttribute('position', new THREE.BufferAttribute(this.pheromonePositions, 3));
		pheromoneGeometry.setAttribute('color', new THREE.BufferAttribute(this.pheromoneColors, 3));
		this.pheromones = new THREE.Points(
			pheromoneGeometry,
			new THREE.PointsMaterial({
				size: 0.095,
				vertexColors: true,
				transparent: true,
				opacity: 0.76,
				depthWrite: false,
				sizeAttenuation: true
			})
		);
		this.scene.add(this.pheromones);

		this.nestLabel.position.set(simulation.nest.x, 1.55, simulation.nest.z);
		this.foodLabel.position.set(simulation.food.x, 1.55, simulation.food.z);
		this.scene.add(this.nestLabel, this.foodLabel);
		this.setView('habitat');
	}

	setView(view: ColonyView): void {
		if (view === 'map') return;
		this.view = view;
		if (view === 'signals') {
			this.camera.position.set(0.01, 16.5, 0.01);
			this.camera.zoom = 0.66;
			this.controls.target.set(0, 0.25, 0);
			this.controls.enableRotate = true;
			(this.pheromones.material as THREE.PointsMaterial).size = 0.14;
			(this.pheromones.material as THREE.PointsMaterial).opacity = 0.96;
		} else {
			this.camera.position.set(12, 10, 12);
			this.camera.zoom = 1;
			this.controls.target.set(0, 0.2, 0);
			this.controls.enableRotate = true;
			(this.pheromones.material as THREE.PointsMaterial).size = 0.09;
			(this.pheromones.material as THREE.PointsMaterial).opacity = 0.62;
		}
		this.camera.updateProjectionMatrix();
		this.controls.update();
	}

	resetOrbit(): void {
		this.setView(this.view === 'signals' ? 'signals' : 'habitat');
	}

	setSignalsVisible(visible: boolean): void {
		this.pheromones.visible = visible;
	}

	resize(width: number, height: number): void {
		if (!width || !height) return;
		this.renderer.setSize(width, height, false);
		const aspect = width / height;
		const halfHeight = aspect < 1 ? 7.2 : 6.2;
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
		this.foodGroup.position.set(this.simulation.food.x, 0.58, this.simulation.food.z);
		this.foodLabel.position.set(this.simulation.food.x, 1.55, this.simulation.food.z);
		this.updateAntInstances();
		if (this.frameCount % (this.preset === 'conserve' ? 5 : 3) === 0) this.updatePheromones();
		this.renderer.render(this.scene, this.camera);
	}

	dispose(): void {
		this.controls.dispose();
		this.scene.traverse((object) => {
			if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
				object.geometry.dispose();
				const materials = Array.isArray(object.material) ? object.material : [object.material];
				for (const material of materials) {
					if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
					material.dispose();
				}
			}
		});
		this.renderer.dispose();
	}

	private updateAntInstances(): void {
		const ants = this.simulation.ants;
		for (const mesh of this.bodyMeshes) {
			const part = mesh.userData.part as { offset: number; scale: number[] };
			for (let index = 0; index < ants.length; index += 1) {
				const ant = ants[index];
				const bob = Math.sin(ant.phase) * 0.018;
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
		for (let index = 0; index < ants.length; index += 1) {
			const ant = ants[index];
			scratch.position.set(
				ant.x + Math.cos(ant.angle) * 0.25,
				ant.hasFood ? 0.86 + Math.sin(ant.phase) * 0.018 : -20,
				ant.z + Math.sin(ant.angle) * 0.25
			);
			scratch.rotation.set(0, ant.angle, 0);
			scratch.scale.setScalar(ant.hasFood ? 1 : 0.001);
			scratch.updateMatrix();
			this.cargoMesh.setMatrixAt(index, scratch.matrix);
		}
		this.cargoMesh.count = ants.length;
		this.cargoMesh.instanceMatrix.needsUpdate = true;
	}

	private updatePheromones(): void {
		let point = 0;
		const { columns, rows, width, depth, homeTrail, foodTrail } = this.simulation;
		for (let row = 0; row < rows; row += 1) {
			for (let column = 0; column < columns; column += 1) {
				const index = row * columns + column;
				for (const [value, color] of [
					[homeTrail[index], homeSignalColor],
					[foodTrail[index], foodSignalColor]
				] as const) {
					if (value < 0.055) continue;
					const offset = point * 3;
					this.pheromonePositions[offset] = -width / 2 + ((column + 0.5) / columns) * width;
					this.pheromonePositions[offset + 1] = 0.64 + value * 0.035;
					this.pheromonePositions[offset + 2] = -depth / 2 + ((row + 0.5) / rows) * depth;
					scratchColor.copy(grassColor).lerp(color, Math.min(1, 0.34 + value * 0.9));
					this.pheromoneColors[offset] = scratchColor.r;
					this.pheromoneColors[offset + 1] = scratchColor.g;
					this.pheromoneColors[offset + 2] = scratchColor.b;
					point += 1;
				}
			}
		}
		this.pheromones.geometry.setDrawRange(0, point);
		(this.pheromones.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
		(this.pheromones.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
	}
}
