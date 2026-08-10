<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';

	let canvas = $state<HTMLCanvasElement>();
	let persistence = $state(68);
	let foragerCount = $state(44);
	let showSignals = $state(true);
	let resetSimulation = $state(() => {});

	type Forager = { phase: number; offset: number; speed: number; returning: boolean };

	onMount(() => {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		let width = 0;
		let height = 0;
		let dpr = 1;
		let raf = 0;
		let last = performance.now();
		let food = { x: 0.77, y: 0.29 };
		let foragers: Forager[] = [];
		let trails: Array<{ x: number; y: number; life: number; home: boolean }> = [];

		const makeForager = (): Forager => ({
			phase: Math.random(),
			offset: Math.random() * 2 - 1,
			speed: 0.06 + Math.random() * 0.035,
			returning: Math.random() > 0.5
		});
		const seed = () => {
			foragers = Array.from({ length: foragerCount }, makeForager);
			trails = [];
		};
		resetSimulation = seed;
		const resize = () => {
			const rect = canvas!.getBoundingClientRect();
			dpr = Math.min(window.devicePixelRatio || 1, 1.5);
			width = rect.width;
			height = rect.height;
			canvas!.width = Math.round(width * dpr);
			canvas!.height = Math.round(height * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		const moveFood = (event: PointerEvent) => {
			const rect = canvas!.getBoundingClientRect();
			food = {
				x: Math.max(0.42, Math.min(0.9, (event.clientX - rect.left) / rect.width)),
				y: Math.max(0.12, Math.min(0.82, (event.clientY - rect.top) / rect.height))
			};
		};
		const grid = () => {
			ctx.fillStyle = '#e8e5db';
			ctx.fillRect(0, 0, width, height);
			ctx.strokeStyle = 'rgba(18,22,19,.10)';
			ctx.lineWidth = 1;
			for (let x = 0; x < width; x += 34) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, height);
				ctx.stroke();
			}
			for (let y = 0; y < height; y += 34) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
				ctx.stroke();
			}
		};
		const label = (text: string, x: number, y: number, accent = '#1849c6') => {
			if (!showSignals) return;
			ctx.font = '700 10px monospace';
			const labelWidth = ctx.measureText(text).width + 18;
			ctx.fillStyle = '#f1efe7';
			ctx.strokeStyle = '#121613';
			ctx.fillRect(x - labelWidth / 2, y - 14, labelWidth, 28);
			ctx.strokeRect(x - labelWidth / 2, y - 14, labelWidth, 28);
			ctx.fillStyle = accent;
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(text, x, y);
		};
		const frame = (now: number) => {
			const delta = Math.min(40, now - last) / 1000;
			last = now;
			while (foragers.length < foragerCount) foragers.push(makeForager());
			foragers.length = Math.max(1, foragerCount);
			const nest = { x: width * 0.2, y: height * 0.68 };
			const target = { x: width * food.x, y: height * food.y };
			grid();
			trails = trails.filter((trail) => (trail.life -= delta * (1.25 - persistence / 120)) > 0);
			for (const trail of trails) {
				ctx.globalAlpha = Math.max(0, trail.life);
				ctx.fillStyle = trail.home ? '#1849c6' : '#ad3f27';
				ctx.beginPath();
				ctx.arc(trail.x, trail.y, 2, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			foragers.forEach((forager, index) => {
				forager.phase += delta * forager.speed;
				if (forager.phase >= 1) {
					forager.phase = 0;
					forager.returning = !forager.returning;
				}
				const t = forager.returning ? 1 - forager.phase : forager.phase;
				const bend = Math.sin(t * Math.PI) * forager.offset * height * 0.18;
				const x = nest.x + (target.x - nest.x) * t;
				const y = nest.y + (target.y - nest.y) * t + bend;
				if ((index + Math.round(now / 80)) % 9 === 0) {
					trails.push({ x, y, life: 0.35 + persistence / 130, home: forager.returning });
				}
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(
					Math.atan2(target.y - nest.y, target.x - nest.x) + (forager.returning ? Math.PI : 0)
				);
				ctx.fillStyle = forager.returning ? '#ad3f27' : '#1849c6';
				ctx.fillRect(-5, -2, 10, 4);
				ctx.restore();
			});
			ctx.fillStyle = '#121613';
			ctx.beginPath();
			ctx.arc(nest.x, nest.y, 31, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = '#d6f05f';
			ctx.beginPath();
			ctx.arc(target.x, target.y, 24, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = '#121613';
			ctx.stroke();
			label('NEST / HOME SIGNAL', nest.x, nest.y + 58);
			label('FOOD / CLICK TO MOVE', target.x, target.y - 48, '#ad3f27');
			raf = requestAnimationFrame(frame);
		};
		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		canvas.addEventListener('pointerdown', moveFood);
		resize();
		seed();
		raf = requestAnimationFrame(frame);
		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
			canvas?.removeEventListener('pointerdown', moveFood);
		};
	});
</script>

<svelte:head>
	<title>Ant Colony Signals · Pinonite Source Lab</title>
	<meta name="description" content="An interactive ant-colony signal simulation." />
</svelte:head>

<main>
	<header>
		<div><strong>PINONITE / SOURCE LAB</strong><span>ANT COLONY SIGNALS</span></div>
		<span>ARCHIVE REBUILD · INTERACTIVE</span>
	</header>
	<section class="stage">
		<canvas
			bind:this={canvas}
			aria-label="Ants carry signals between a nest and movable food source"
		></canvas>
		<div class="instruction">CLICK THE FIELD TO MOVE FOOD ↗</div>
	</section>
	<section class="controls" aria-label="Ant colony controls">
		<label
			><span>TRAIL PERSISTENCE <output>{persistence}%</output></span><input
				type="range"
				min="10"
				max="100"
				bind:value={persistence}
			/></label
		>
		<label
			><span>FORAGERS <output>{foragerCount}</output></span><input
				type="range"
				min="8"
				max="90"
				bind:value={foragerCount}
			/></label
		>
		<button class:active={showSignals} type="button" onclick={() => (showSignals = !showSignals)}
			>SIGNAL LABELS {showSignals ? 'ON' : 'OFF'}</button
		>
		<button type="button" onclick={resetSimulation}>RESET COLONY ↻</button>
	</section>
	<footer><span>LOCAL RULES → SHARED PATHS</span><span>NO CENTRAL ROUTE PLANNER</span></footer>
</main>
