<script>
	import { toolManager, ToolName } from '$lib/tools/toolManager.svelte';
	const tools = Object.values(ToolName);
</script>

<div class="container">
	<div>
		{#each tools as tool}
			<button
				on:click={() => (toolManager.selectedTool = tool)}
				class:selected={toolManager.selectedTool === tool}>{tool}</button
			>
		{/each}
	</div>
</div>

<style>
	div.container {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		padding: 5px;
	}

	button.selected {
	}
</style>
