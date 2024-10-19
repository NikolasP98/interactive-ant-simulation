<script lang="ts">
	import { world } from '$stores/worldStore.svelte';
	import { onMount } from 'svelte';

	// Run Simulation

	let canvas_el: HTMLCanvasElement;

	let dimensions: { x: number; y: number } = $state({ x: 0, y: 0 });

	onMount(() => {
		if (!window) return;
		if (!canvas_el) return;

		world.setup(canvas_el, dimensions);

		$inspect(world.cols);

		return () => {
			world.destroy();
		};
	});

	// export world = new World();
</script>

<canvas bind:this={canvas_el} id="canvas"></canvas>

<svelte:window bind:innerHeight={dimensions.y} bind:innerWidth={dimensions.x} />
