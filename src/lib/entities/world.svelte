<script lang="ts">
	import { world } from '$stores/worldStore.svelte';
	import { onMount } from 'svelte';

	import GUI from '$utils/debugGUI.svelte';

	let canvas_el: HTMLCanvasElement;

	let dimensions: { x: number; y: number } = $state({ x: 0, y: 0 });

	onMount(() => {
		if (!window) return;
		if (!canvas_el) return;

		world.setup(canvas_el, dimensions);

		return () => {
			world.destroy();
		};
	});

	// export world = new World();
</script>

<GUI />

<canvas
	bind:this={canvas_el}
	bind:clientWidth={dimensions.x}
	bind:clientHeight={dimensions.y}
	id="canvas"
></canvas>

<!-- <svelte:window bind:innerHeight={dimensions.y} bind:innerWidth={dimensions.x} /> -->
