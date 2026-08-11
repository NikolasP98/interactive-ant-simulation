<script lang="ts">
	import { onMount } from 'svelte';
	import { ColonyScene, type ColonyView, type ResourcePreset } from '$lib/colonyScene';
	import { ColonySimulation } from '$lib/simulation';
	import '../app.css';

	const availableViews: ColonyView[] = ['habitat', 'signals', 'map'];
	let stage = $state<HTMLElement>();
	let threeCanvas = $state<HTMLCanvasElement>();
	let mapCanvas = $state<HTMLCanvasElement>();
	let view = $state<ColonyView>('habitat');
	let blogMode = $state(false);
	let session = $state('ant-colony-reading');
	let resourcePreset = $state<ResourcePreset>('balanced');
	let active = $state(true);
	let playing = $state(true);
	let showSignals = $state(true);
	let population = $state(52);
	let persistence = $state(68);
	let simSpeed = $state(1);
	let delivered = $state(0);
	let carrying = $state(0);
	let pointerStart = { x: 0, y: 0 };
	let simulation: ColonySimulation | null = null;
	let colonyScene: ColonyScene | null = null;

	const resolvePreset = (requested: string | null): ResourcePreset => {
		if (requested === 'conserve' || requested === 'balanced' || requested === 'full') return requested;
		const memory = Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4);
		const cores = navigator.hardwareConcurrency ?? 4;
		const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
		return saveData || memory <= 4 || cores <= 4 ? 'conserve' : 'balanced';
	};

	const persistSettings = () => {
		if (!simulation) return;
		simulation.settings.persistence = persistence;
		simulation.settings.speed = simSpeed;
		simulation.resizePopulation(population);
		localStorage.setItem(
			`pinoniteAntLab:${session}`,
			JSON.stringify({ population, persistence, simSpeed, showSignals, food: simulation.food })
		);
	};

	const switchView = (next: ColonyView) => {
		view = next;
		if (next !== 'map') colonyScene?.setView(next);
	};

	const resetColony = () => {
		simulation?.reset();
		persistSettings();
	};

	const clickGround = (event: PointerEvent) => {
		if (!simulation) return;
		if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
		if (view === 'map' && mapCanvas) {
			const rect = mapCanvas.getBoundingClientRect();
			const padding = Math.min(rect.width, rect.height) * 0.055;
			const x = ((event.clientX - rect.left - padding) / (rect.width - padding * 2) - 0.5) * simulation.width;
			const z = ((event.clientY - rect.top - padding) / (rect.height - padding * 2) - 0.5) * simulation.depth;
			simulation.moveFood(x, z);
		} else {
			const point = colonyScene?.groundPoint(event.clientX, event.clientY);
			if (point) simulation.moveFood(point.x, point.z);
		}
		persistSettings();
	};

	const drawMap = (context: CanvasRenderingContext2D, width: number, height: number) => {
		if (!simulation) return;
		const padding = Math.min(width, height) * 0.055;
		const fieldWidth = width - padding * 2;
		const fieldHeight = height - padding * 2;
		const toScreen = (x: number, z: number) => ({
			x: padding + ((x + simulation!.width / 2) / simulation!.width) * fieldWidth,
			y: padding + ((z + simulation!.depth / 2) / simulation!.depth) * fieldHeight
		});
		context.fillStyle = '#f3f0e6';
		context.fillRect(0, 0, width, height);
		context.fillStyle = '#dfe8d1';
		context.strokeStyle = '#6a765e';
		context.lineWidth = 1;
		context.fillRect(padding, padding, fieldWidth, fieldHeight);
		context.strokeRect(padding, padding, fieldWidth, fieldHeight);
		context.strokeStyle = 'rgba(64,78,58,.12)';
		for (let x = padding; x <= width - padding; x += fieldWidth / 12) {
			context.beginPath();
			context.moveTo(x, padding);
			context.lineTo(x, height - padding);
			context.stroke();
		}
		for (let y = padding; y <= height - padding; y += fieldHeight / 8) {
			context.beginPath();
			context.moveTo(padding, y);
			context.lineTo(width - padding, y);
			context.stroke();
		}

		if (showSignals) {
			for (let row = 0; row < simulation.rows; row += 1) {
				for (let column = 0; column < simulation.columns; column += 1) {
					const index = row * simulation.columns + column;
					const home = simulation.homeTrail[index];
					const food = simulation.foodTrail[index];
					if (home < 0.06 && food < 0.06) continue;
					const point = toScreen(
						-simulation.width / 2 + ((column + 0.5) / simulation.columns) * simulation.width,
						-simulation.depth / 2 + ((row + 0.5) / simulation.rows) * simulation.depth
					);
					const value = Math.max(home, food);
					context.globalAlpha = 0.22 + value * 0.7;
					context.fillStyle = food > home ? '#df6747' : '#4e91bd';
					context.beginPath();
					context.arc(point.x, point.y, 1.25 + value * 2, 0, Math.PI * 2);
					context.fill();
				}
			}
			context.globalAlpha = 1;
		}

		for (const ant of simulation.ants) {
			const point = toScreen(ant.x, ant.z);
			context.save();
			context.translate(point.x, point.y);
			context.rotate(ant.angle);
			context.fillStyle = '#2d2018';
			for (const [offset, radius] of [
				[-4.5, 3.2],
				[0, 2.7],
				[4, 2.3]
			] as const) {
				context.beginPath();
				context.ellipse(offset, 0, radius * 1.2, radius, 0, 0, Math.PI * 2);
				context.fill();
			}
			if (ant.hasFood) {
				context.fillStyle = '#e6c842';
				context.beginPath();
				context.arc(8, 0, 2.4, 0, Math.PI * 2);
				context.fill();
			}
			context.restore();
		}

		const nest = toScreen(simulation.nest.x, simulation.nest.z);
		context.fillStyle = '#a98d5c';
		context.beginPath();
		context.arc(nest.x, nest.y, 18, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = '#171b17';
		context.beginPath();
		context.arc(nest.x, nest.y, 7, 0, Math.PI * 2);
		context.fill();
		const food = toScreen(simulation.food.x, simulation.food.z);
		for (let index = 0; index < 6; index += 1) {
			context.fillStyle = ['#d8ed57', '#e5c64f', '#c96043'][index % 3];
			context.beginPath();
			context.arc(food.x + Math.cos(index) * 8, food.y + Math.sin(index) * 7, 5, 0, Math.PI * 2);
			context.fill();
		}
	};

	onMount(() => {
		if (!stage || !threeCanvas || !mapCanvas) return;
		const params = new URLSearchParams(location.search);
		blogMode = params.get('mode') === 'blog';
		session = params.get('session') || session;
		const requestedView = params.get('view') as ColonyView;
		view = availableViews.includes(requestedView) ? requestedView : 'habitat';
		resourcePreset = resolvePreset(params.get('preset'));
		const saved = localStorage.getItem(`pinoniteAntLab:${session}`);
		if (saved) {
			try {
				const settings = JSON.parse(saved);
				population = Number(settings.population) || population;
				persistence = Number(settings.persistence) || persistence;
				simSpeed = Number(settings.simSpeed) || simSpeed;
				showSignals = settings.showSignals ?? showSignals;
			} catch {
				// Ignore older or incomplete settings snapshots.
			}
		}
		simulation = new ColonySimulation(session, { population, persistence, speed: simSpeed });
		if (saved) {
			try {
				const food = JSON.parse(saved).food;
				if (food) simulation.moveFood(Number(food.x), Number(food.z));
			} catch {
				// The colony still starts with a safe default food location.
			}
		}
		colonyScene = new ColonyScene(threeCanvas, simulation, resourcePreset);
		if (view !== 'map') colonyScene.setView(view);

		const resize = () => {
			const rect = stage!.getBoundingClientRect();
			colonyScene?.resize(rect.width, rect.height);
			const dpr = Math.min(window.devicePixelRatio || 1, resourcePreset === 'conserve' ? 1 : 1.6);
			mapCanvas!.width = Math.round(rect.width * dpr);
			mapCanvas!.height = Math.round(rect.height * dpr);
			const context = mapCanvas!.getContext('2d');
			context?.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		const observer = new ResizeObserver(resize);
		observer.observe(stage);
		resize();

		let raf = 0;
		let last = performance.now();
		let readoutClock = 0;
		const frame = (now: number) => {
			const delta = Math.min(50, now - last) / 1000;
			last = now;
			if (active) {
				if (playing) simulation?.update(delta);
				if (view === 'map') {
					const rect = stage!.getBoundingClientRect();
					const context = mapCanvas!.getContext('2d');
					if (context) drawMap(context, rect.width, rect.height);
				} else {
					colonyScene?.setSignalsVisible(showSignals);
					colonyScene?.render();
				}
			}
			readoutClock += delta;
			if (readoutClock > 0.2 && simulation) {
				delivered = simulation.deliveries;
				carrying = simulation.ants.filter((ant) => ant.hasFood).length;
				readoutClock = 0;
			}
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);

		const receive = (event: MessageEvent) => {
			if (event.data?.session !== session) return;
			if (event.data?.type === 'pinonite-lab:set-view' && availableViews.includes(event.data.view)) {
				switchView(event.data.view);
			}
			if (event.data?.type === 'pinonite-lab:set-active') active = Boolean(event.data.active);
		};
		window.addEventListener('message', receive);
		window.parent.postMessage({ type: 'pinonite-lab:ready', session }, '*');

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
			window.removeEventListener('message', receive);
			colonyScene?.dispose();
		};
	});
</script>

<svelte:head>
	<title>Ant Colony Signals · Pinonite Source Lab</title>
	<meta
		name="description"
		content="An orbitable ant-colony habitat where local pheromone rules become shared paths."
	/>
</svelte:head>

<main data-mode={blogMode ? 'blog' : 'expanded'} data-view={view}>
	<header class="lab-header">
		<div class="identity"><strong>PINONITE / SOURCE LAB</strong><span>ANTS WRITE THE MAP</span></div>
		{#if !blogMode}
			<nav aria-label="Simulation views">
				{#each availableViews as item}
					<button class:active={view === item} type="button" onclick={() => switchView(item)}>
						{item === 'habitat' ? 'HABITAT' : item === 'signals' ? 'SIGNALS' : '2D FIELD'}
					</button>
				{/each}
			</nav>
		{/if}
		<span class="mode-label">{view === 'map' ? 'ORIGINAL VIEW · LIVE' : 'COLONY SESSION · LIVE'}</span>
	</header>

	<section class="stage" bind:this={stage} aria-label="Live ant colony habitat">
		<canvas
			class:hidden={view === 'map'}
			bind:this={threeCanvas}
			onpointerdown={(event) => (pointerStart = { x: event.clientX, y: event.clientY })}
			onpointerup={clickGround}
			aria-label="Orbitable isometric ant habitat. Drag to orbit and click the ground to move food."
		></canvas>
		<canvas
			class:hidden={view !== 'map'}
			bind:this={mapCanvas}
			onpointerdown={(event) => (pointerStart = { x: event.clientX, y: event.clientY })}
			onpointerup={clickGround}
			aria-label="Top-down ant simulation. Click the field to move food."
		></canvas>

		<div class="view-note">
			<span>{view === 'habitat' ? 'ISOMETRIC HABITAT' : view === 'signals' ? 'PHEROMONE FIELD' : 'TOP-DOWN ARCHIVE'}</span>
			<strong>
				{view === 'habitat'
					? 'Small rules, busy world'
					: view === 'signals'
						? 'The ground keeps the colony’s memory'
						: 'The original idea, kept in view'}
			</strong>
		</div>
		<div class="readout" aria-live="polite">
			<span><b>{String(delivered).padStart(2, '0')}</b> DELIVERIES</span>
			<span><b>{String(carrying).padStart(2, '0')}</b> RETURNING</span>
		</div>
		<div class="instruction">
			{view === 'map' ? 'CLICK FIELD TO MOVE FOOD' : 'DRAG TO ORBIT · CLICK GROUND TO MOVE FOOD'} ↗
		</div>
		{#if view === 'signals'}
			<div class="signal-key"><span class="home-dot"></span> HOME MEMORY <span class="food-dot"></span> FOOD MEMORY</div>
		{/if}
	</section>

	<section class="controls" aria-label="Ant colony controls">
		{#if view === 'habitat'}
			<label>
				<span>FORAGERS <output>{population}</output></span>
				<input type="range" min="12" max={resourcePreset === 'conserve' ? 64 : 100} bind:value={population} oninput={persistSettings} />
			</label>
			<label>
				<span>TIME SCALE <output>{simSpeed.toFixed(1)}×</output></span>
				<input type="range" min="0.4" max="2" step="0.1" bind:value={simSpeed} oninput={persistSettings} />
			</label>
			<button type="button" onclick={() => colonyScene?.resetOrbit()}>RESET ORBIT ↻</button>
		{:else if view === 'signals'}
			<label>
				<span>TRAIL PERSISTENCE <output>{persistence}%</output></span>
				<input type="range" min="20" max="96" bind:value={persistence} oninput={persistSettings} />
			</label>
			<label>
				<span>FORAGERS <output>{population}</output></span>
				<input type="range" min="12" max={resourcePreset === 'conserve' ? 64 : 100} bind:value={population} oninput={persistSettings} />
			</label>
			<button class:active={showSignals} type="button" onclick={() => { showSignals = !showSignals; persistSettings(); }}>SIGNALS {showSignals ? 'ON' : 'OFF'}</button>
		{:else}
			<label>
				<span>TRAIL PERSISTENCE <output>{persistence}%</output></span>
				<input type="range" min="20" max="96" bind:value={persistence} oninput={persistSettings} />
			</label>
			<label>
				<span>FORAGERS <output>{population}</output></span>
				<input type="range" min="12" max={resourcePreset === 'conserve' ? 64 : 100} bind:value={population} oninput={persistSettings} />
			</label>
			<button class:active={showSignals} type="button" onclick={() => { showSignals = !showSignals; persistSettings(); }}>SIGNALS {showSignals ? 'ON' : 'OFF'}</button>
		{/if}
		<button class:active={!playing} type="button" onclick={() => (playing = !playing)}>{playing ? 'PAUSE' : 'RESUME'} COLONY</button>
		<button type="button" onclick={resetColony}>NEW COLONY ↻</button>
	</section>

	{#if !blogMode}
		<footer><span>LOCAL RULES → SHARED PATHS</span><span>{resourcePreset.toUpperCase()} RENDER PRESET</span></footer>
	{/if}
</main>
