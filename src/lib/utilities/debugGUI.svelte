<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Pane,
		type PanePosition,
		RadioGrid,
		Folder,
		Button,
		Separator,
		AutoObject,
		TabGroup,
		TabPage,
		FpsGraph
	} from 'svelte-tweakpane-ui';

	import parameters from '$stores/GUISettings.svelte';

	onMount(() => {
		if (!window) return;
		// make sure debug component was instantiated
	});
</script>

<!-- Create a pane with a title and a dynamic position -->
<Pane position="draggable" title="Simulation Settings" y={110}>
	<!-- Create a reset button that logs a message to the console -->
	<TabGroup>
		<TabPage title="General">
			<!-- Iterate over the params settings and create a folder for each one -->
			{#each parameters.settings as param}
				<Folder title={param.name}>
					<!-- Iterate over the subsettings of each param and create a button for each one -->
					{#each param.subsettings as item}
						<Folder title={item.name}>
							<AutoObject bind:object={item.values} />
							<!-- <Button title={`reset ${item.name} settings`} /> -->
						</Folder>
					{/each}
				</Folder>
				<!-- Add a separator after each folder -->
			{/each}
			<Separator />
		</TabPage>

		<TabPage title="Performance"></TabPage>
	</TabGroup>
	<FpsGraph interval={50} label="FPS" rows={5} />
	<Button title="reset" on:click={() => parameters.reset()} />
</Pane>
