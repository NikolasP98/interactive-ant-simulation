<script lang="ts">
	import '../app.css';
	import World from '$ents/world.svelte';

	let width: number;
	let height: number;
</script>

<svelte:head>
	<title>Ant Sim</title>
</svelte:head>

<World />
<div class="debug">
	<pre>width: {width}</pre>
	<pre>height: {height}</pre>
</div>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />
