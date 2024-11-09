<script lang="ts">
	import { onMount } from 'svelte';
	import { toolManager } from '$lib/tools/toolManager.svelte';
	import { Window } from '$lib/state/window.svelte';

	let svg: SVGSVGElement | null = null;
	let viewBox = $derived.by(() => {
		return `0 0 ${Window.width} ${Window.height}`;
	});
	let backgroundColor = $state('#fff');
	let selectedTool = $derived(toolManager.selectedTool);

	onMount(() => {
		const handleResize = () => {
			if (!svg) return;
			Window.width = window.innerWidth;
			Window.height = window.innerHeight;
			svg.setAttribute('viewBox', viewBox);
		};
		window.addEventListener('resize', handleResize);
		handleResize();

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('load', handleResize);
		};
	});
</script>

<svg bind:this={svg} style="border: 1px solid #ccc;"></svg>
<style>
	svg {
		width: 100vw;
		height: 100vh;
		background-color: hsl(50, 100%, 92%);
	}
</style>