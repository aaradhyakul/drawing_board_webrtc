<script lang="ts">
	import { onMount } from 'svelte';
	import { toolManager, ToolName } from '$lib/tools/toolManager.svelte';
	import { Window } from '$lib/state/window.svelte';
	import {strokes, qt, Stroke, StrokeSegment} from '$lib/state/strokes.svelte'
	import Toolbar from './Toolbar.svelte';

	let svg: SVGSVGElement | null = null;
	let viewBox = $derived.by(() => {
		return `0 0 ${Window.width} ${Window.height}`;
	});
	let backgroundColor = $state('#fff');
	let selectedTool = $derived(toolManager.selectedTool);
	let currentStroke = $state<Stroke>()
	let eraserBounds = $state<Bounds>()
	let isDrawing = $state(false);
	let candidateStrokeSegments = $state<StrokeSegment[]>()

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
		// console.log("onPointerDown")
		const {clientX: x, clientY: y,button} = event;
		if(button !== 0){
			return;
		}
		isDrawing = true;
		if(toolManager.selectedTool === ToolName.Pen){
			currentStroke = new Stroke([{x, y}]);
		}else{
			candidateStrokeSegments = []
			eraserBounds = {x: x - 15, y: y - 15, width: 30, height: 30}
		}
	}
	$effect(() => {
		$inspect(candidateStrokeSegments)
	})

	const onPointerMove = (event: MouseEvent) =>{
		// console.log("onPointerMove")
		if(!isDrawing){
			return;
		}
		const {clientX: x, clientY: y,button} = event;
		if(toolManager.selectedTool === ToolName.Pen){
			if(currentStroke){
				currentStroke?.points.push({x, y});
				currentStroke.generatePath();
			}
		}else{
			eraserBounds = {x: x - 15, y: y - 15, width: 30, height: 30}
			candidateStrokeSegments = candidateStrokeSegments?.concat(qt.getCandidateStrokeSegments(eraserBounds))
		}
		// console.log(currentStroke?.path)
	}

	const onPointerUp = (event: MouseEvent) =>{
		// console.log("onPointerUp")
		if(!isDrawing){
			return;
		}
		isDrawing = false;
		if(toolManager.selectedTool === ToolName.Pen){
			if(currentStroke){
				currentStroke.segmentizeStroke();
				qt.insertStroke(currentStroke);
				// console.dir(qt, {depth: null})
				strokes.set(currentStroke);
				// console.log(currentStroke)
			}
		}else{
			// $inspect(candidateStrokeSegments)
		}
		// console.log(strokes);
	}
</script>

<svg bind:this={svg} style="border: 1px solid #ccc;"
onmousedown={onPointerDown}
onmousemove={onPointerMove}
onmouseup={onPointerUp}
aria-label="drawing canvas"
role="application">
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