<script lang="ts">
	import { onMount } from 'svelte';
	import { toolManager } from '$lib/tools/toolManager.svelte';
	import { Window } from '$lib/state/window.svelte';
	import {strokes, qt, Stroke} from '$lib/state/strokes.svelte'

	let svg: SVGSVGElement | null = null;
	let viewBox = $derived.by(() => {
		return `0 0 ${Window.width} ${Window.height}`;
	});
	let backgroundColor = $state('#fff');
	let selectedTool = $derived(toolManager.selectedTool);
	let currentStroke = $state<Stroke>()
	let isDrawing = $state(false);

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

	const onPointerDown = (event: MouseEvent) =>{
		console.log("onPointerDown")
		const {x, y,button} = event;
		// if(pointerType === 'Mouse' && button !== 0){
		// 	return;
		// }
		isDrawing = true;
		currentStroke = new Stroke([{x, y}]);
	}

	const onPointerMove = (event: MouseEvent) =>{
		console.log("onPointerMove")
		if(!isDrawing){
			return;
		}
		const {x, y} = event;
		if(currentStroke){
			currentStroke?.points.push({x, y});
		}
		// console.log(currentStroke?.path)
	}

	const onPointerUp = (event: MouseEvent) =>{
		console.log("onPointerUp")
		if(!isDrawing){
			return;
		}
		isDrawing = false;
		if(currentStroke){
			strokes.set(currentStroke);
			currentStroke.segmentizeStroke();
		}
		console.log(strokes);
		// console.log(currentStroke)
	}
</script>

<svg bind:this={svg} style="border: 1px solid #ccc;"
onmousedown={onPointerDown}
onmousemove={onPointerMove}
onmouseup={onPointerUp}
>
{#each strokes.values() as stroke}
	<path d={stroke.path} fill="black" stroke="black" stroke-width="2"/>
{/each}
{#if currentStroke}
	<path d={currentStroke.path} fill="black" stroke="black" stroke-width="2"/>
{/if}
</svg>
<style>
	svg {
		width: 100vw;
		height: 100vh;
		background-color: hsl(50, 100%, 92%);
	}
</style>