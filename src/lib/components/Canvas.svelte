<script lang="ts">
	import { onMount } from 'svelte';
	import { toolManager } from '$lib/tools/toolManager.svelte';

	let canvas: HTMLCanvasElement | null = null;
	let width = $state(400);
	let height = $state(100);
	let backgroundColor = $state('#fff');
	let selectedTool = $derived(toolManager.selectedTool);

	onMount(() => {
		if (!canvas) return;
		// Handle window resize
		const handleResize = () => {
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});
</script>

<canvas
    bind:this={canvas}
    width={width}
    height={height}
    style="border: 1px solid #ccc;"
>
    <!-- Paper.js will inject SVG content here -->
</canvas>
<style>
	canvas {
		width: 100%;
		height: 50%;
		background-color: var(--bg-color);
	}
</style>