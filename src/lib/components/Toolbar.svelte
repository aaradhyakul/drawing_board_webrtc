<script>
	import { toolManager, ToolName } from '$lib/tools/toolManager.svelte';
</script>
<div>
	<button on:click={() => toolManager.selectedTool = ToolName.Pen}>Pen</button>
	<button on:click={() => toolManager.selectedTool = ToolName.Eraser}>Eraser</button>
	<!-- <button on:click={() => toolManager.setSelectedTool('select')}>Select</button>
	<button on:click={() => toolManager.setSelectedTool('move')}>Move</button>
	<button on:click={() => toolManager.setSelectedTool('pan')}>Pan</button>
	<button on:click={() => toolManager.setSelectedTool('textbox')}>Textbox</button>
	<button on:click={() => toolManager.setSelectedTool('ellipse')}>Ellipse</button>
	<button on:click={() => drawingState.setSelectedTool('rectangle')}>Rectangle</button> -->
<h1>{toolManager.selectedTool}</h1>
</div>

<style>
	div {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 100;
	}
</style>
