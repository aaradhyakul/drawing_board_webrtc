<script>
	import { toolManager, ToolName } from '$lib/tools/toolManager.svelte';
	const tools = Object.values(ToolName);
</script>

<div class="container">
	<div class="tools">
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
		top: 5px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		padding: 5px;
		background-color: hsl(45, 90%, 93%);
		box-shadow: 0 0 5px 0px hsl(45, 100%, 90%);
		border: 1px solid gainsboro;
		border-radius: 3px;
	}

	div.tools {
		display: flex;
		gap: 7px;
	}

	button {
		border: none;
		padding: 4px;
		background-color: hsl(45, 97%, 88%);
		border-radius: 3px;
		font-size: var(--text-xs);
		transition: var(--transition-fast);
	}

	button:hover {
		background-color: hsl(45, 100%, 82%);
	}

	button.selected {
		background-color: hsl(45, 100%, 74%);
	}
</style>
